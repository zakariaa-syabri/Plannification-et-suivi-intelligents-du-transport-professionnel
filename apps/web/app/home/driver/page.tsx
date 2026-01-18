'use client';

/**
 * DRIVER DASHBOARD
 * Interface mobile-friendly pour les chauffeurs
 * Affiche les missions assignées et permet de mettre à jour leur statut
 */

import { useState, useEffect } from 'react';
import { getSupabaseBrowserClient } from '@kit/supabase/browser-client';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Button } from '@kit/ui/button';
import { Badge } from '@kit/ui/badge';
import { useUserRole } from '~/contexts';
import { useVocabulary } from '~/contexts';
import { Icons } from '~/config/icons.config';
import { Icon } from '~/components/ui/icon';

interface Mission {
  id: string;
  reference: string;
  name: string;
  description: string | null;
  scheduled_date: string;
  start_time: string;
  estimated_end_time: string | null;
  status: string;
  priority: string;
  dispatcher_notes: string | null;
  [key: string]: any;
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  planned: 'bg-blue-100 text-blue-800',
  assigned: 'bg-yellow-100 text-yellow-800',
  accepted: 'bg-indigo-100 text-indigo-800',
  in_progress: 'bg-green-100 text-green-800',
  completed: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-red-100 text-red-800',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  planned: 'Planifiée',
  assigned: 'Assignée',
  accepted: 'Acceptée',
  in_progress: 'En cours',
  completed: 'Terminée',
  cancelled: 'Annulée',
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-500 text-white',
  high: 'bg-orange-500 text-white',
  normal: 'bg-blue-500 text-white',
  low: 'bg-gray-500 text-white',
};

export default function DriverDashboard() {
  const { profile, isDriver, isLoading: roleLoading } = useUserRole();
  const { labels } = useVocabulary();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [filter, setFilter] = useState<'today' | 'upcoming' | 'all'>('today');

  useEffect(() => {
    // Charger les missions même sans profile pour la visualisation
    loadMissions();
  }, [filter]);

  const loadMissions = async () => {
    // Temporairement désactivé pour visualisation
    // if (!profile?.id) return;

    setIsLoading(true);
    setLoadError(null);
    const supabase = getSupabaseBrowserClient();

    try {
      // ⚠️ NOTE: Essayer plusieurs colonnes possibles pour le driver
      // Selon le schema, ça peut être: driver_id, assigned_to_id, user_id, etc.
      let query = supabase
        .from('missions')
        .select('*')
        // Temporairement commenté pour visualisation - normalement filtrer par driver
        // .eq('driver_id', profile.id)
        .not('status', 'eq', 'cancelled')
        .order('scheduled_date', { ascending: true })
        .order('start_time', { ascending: true });

      // Filtrer par date
      const today = new Date().toISOString().split('T')[0];
      if (filter === 'today') {
        query = query.eq('scheduled_date', today);
      } else if (filter === 'upcoming') {
        query = query.gte('scheduled_date', today);
      }

      const { data, error } = await query;

      if (error) {
        // ⚠️ ERREUR COURANTE: "column driver_id does not exist"
        const errorMsg = error?.message || JSON.stringify(error);
        if (errorMsg.includes('driver_id')) {
          throw new Error('⚠️ Erreur: Colonne "driver_id" introuvable. Vérifier le schema missions.');
        }
        throw error;
      }
      setMissions(data || []);
    } catch (err: any) {
      console.error('Erreur chargement missions:', err);
      const errorMessage = err?.message || JSON.stringify(err) || 'Erreur lors du chargement des missions';
      console.error('Détails erreur:', errorMessage);
      setLoadError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const updateMissionStatus = async (missionId: string, newStatus: string) => {
    const supabase = getSupabaseBrowserClient();

    try {
      const updates: any = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      if (newStatus === 'in_progress') {
        updates.actual_start_time = new Date().toISOString();
      } else if (newStatus === 'completed') {
        updates.actual_end_time = new Date().toISOString();
      }

      const { error } = await supabase
        .from('missions')
        .update(updates)
        .eq('id', missionId);

      if (error) throw error;

      // Recharger les missions
      loadMissions();
      setSelectedMission(null);
    } catch (err) {
      console.error('Erreur mise à jour statut:', err);
    }
  };

  const openNavigation = (lat: number, lng: number, address?: string) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, '_blank');
  };

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Icon icon={Icons.ui.loading} size="xl" className="animate-spin" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Icon icon={Icons.status.alert} size="xl" className="mx-auto mb-4 text-red-500" />
            <h2 className="font-semibold mb-2">Erreur de chargement</h2>
            <p className="text-sm text-muted-foreground mb-4">{loadError}</p>
            <Button onClick={loadMissions}>Réessayer</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Temporairement désactivé pour visualisation
  // if (!isDriver) {
  //   return (
  //     <div className="p-8 text-center">
  //       <Icon icon={Icons.security.lock} size="xl" className="mx-auto mb-4 text-muted-foreground" />
  //       <h2 className="text-xl font-semibold mb-2">Accès restreint</h2>
  //       <p className="text-muted-foreground mb-2">
  //         Cette interface est réservée aux chauffeurs.
  //       </p>
  //       <p className="text-sm text-muted-foreground">
  //         Votre rôle: <span className="font-medium">{profile?.user_type || 'non défini'}</span>
  //       </p>
  //     </div>
  //   );
  // }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Icon icon={Icons.ui.loading} size="xl" className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-background border-b z-10">
        <div className="p-4">
          <h1 className="text-xl font-bold">Mes {labels.missionPlural}</h1>
          <p className="text-sm text-muted-foreground">
            Bienvenue, {profile?.display_name || 'Chauffeur'}
          </p>
        </div>

        {/* Filtres */}
        <div className="flex gap-2 px-4 pb-3">
          <Button
            variant={filter === 'today' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('today')}
          >
            Aujourd'hui
          </Button>
          <Button
            variant={filter === 'upcoming' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('upcoming')}
          >
            À venir
          </Button>
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            Toutes
          </Button>
        </div>
      </div>

      {/* Liste des missions */}
      <div className="p-4 space-y-4">
        {missions.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Icon icon={Icons.mission.route} size="xl" className="mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground">
                {filter === 'today'
                  ? 'Aucune mission pour aujourd\'hui'
                  : 'Aucune mission trouvée'}
              </p>
            </CardContent>
          </Card>
        ) : (
          missions.map((mission) => (
            <Card
              key={mission.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedMission(mission)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{mission.name}</CardTitle>
                  <Badge className={PRIORITY_COLORS[mission.priority]}>
                    {mission.priority}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{mission.reference}</span>
                  <span>•</span>
                  <span>{new Date(mission.scheduled_date).toLocaleDateString('fr-FR')}</span>
                  <span>•</span>
                  <span>{mission.start_time?.substring(0, 5)}</span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Badge className={STATUS_COLORS[mission.status]}>
                    {STATUS_LABELS[mission.status]}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Modal détail mission */}
      {selectedMission && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center">
          <div className="bg-background w-full md:max-w-lg md:rounded-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-background border-b p-4 flex items-center justify-between">
              <h2 className="font-semibold">{selectedMission.name}</h2>
              <Button variant="ghost" size="sm" onClick={() => setSelectedMission(null)}>
                <Icon icon={Icons.ui.close} size="sm" />
              </Button>
            </div>

            <div className="p-4 space-y-4">
              {/* Infos mission */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Référence</span>
                  <span>{selectedMission.reference}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date</span>
                  <span>{new Date(selectedMission.scheduled_date).toLocaleDateString('fr-FR')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Heure de départ</span>
                  <span>{selectedMission.start_time?.substring(0, 5)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Statut</span>
                  <Badge className={STATUS_COLORS[selectedMission.status]}>
                    {STATUS_LABELS[selectedMission.status]}
                  </Badge>
                </div>
              </div>

              {/* Notes dispatcher */}
              {selectedMission.dispatcher_notes && (
                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-sm font-medium mb-1">Notes du dispatcher</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedMission.dispatcher_notes}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="pt-4 border-t space-y-2">
                {selectedMission.status === 'assigned' && (
                  <Button
                    className="w-full"
                    onClick={() => updateMissionStatus(selectedMission.id, 'accepted')}
                  >
                    Accepter la mission
                  </Button>
                )}
                {selectedMission.status === 'accepted' && (
                  <Button
                    className="w-full"
                    onClick={() => updateMissionStatus(selectedMission.id, 'in_progress')}
                  >
                    Démarrer la mission
                  </Button>
                )}
                {selectedMission.status === 'in_progress' && (
                  <Button
                    className="w-full"
                    variant="default"
                    onClick={() => updateMissionStatus(selectedMission.id, 'completed')}
                  >
                    Terminer la mission
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
