'use client';

/**
 * Liste des missions avec contrôles
 * Permet de démarrer, arrêter et suivre les missions
 */

import { useState } from 'react';
import { Card } from '@kit/ui/card';
import { Button } from '@kit/ui/button';
import { Badge } from '@kit/ui/badge';
import { Icons } from '~/config/icons.config';
import { Icon } from '~/components/ui/icon';
import { updateMissionStatusAction, deleteMissionAction } from '../_actions/mission.action';
import { optimizeMissionAction } from '../_actions/optimization.action';
import { debugMissionAction } from '../_actions/debug-mission.action';

interface Mission {
  id: string;
  name: string;
  status: string;
  planned_date: string;
  planned_start_time?: string;
  is_optimized?: boolean;
  total_distance_km?: number;
  estimated_duration_minutes?: number;
  vehicle?: {
    id: string;
    name: string;
  };
  stops?: Array<{
    id: string;
    status: string;
  }>;
}

interface MissionListProps {
  missions: Mission[];
  onUpdate: () => void;
  labels?: {
    mission: string;
    missionPlural: string;
  };
}

export function MissionList({ missions, onUpdate, labels }: MissionListProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleStatusChange = async (
    missionId: string,
    newStatus: 'in_progress' | 'completed' | 'cancelled' | 'paused'
  ) => {
    setLoading(missionId);
    await updateMissionStatusAction(missionId, newStatus);
    setLoading(null);
    onUpdate();
  };

  const handleDelete = async (missionId: string) => {
    if (!confirm('Supprimer cette mission ?')) return;
    setLoading(missionId);
    await deleteMissionAction(missionId);
    setLoading(null);
    onUpdate();
  };

  const handleOptimize = async (missionId: string) => {
    setLoading(missionId);
    const result = await optimizeMissionAction(missionId);
    setLoading(null);
    if (result.success) {
      alert(`✅ Route optimisée!\n\nDistance: ${result.data?.total_distance_km} km\nDurée: ${result.data?.total_time_minutes} min\nAlgorithme: ${result.data?.algorithm}`);
      onUpdate();
    } else {
      alert(`❌ Erreur: ${result.error}`);
    }
  };

  const handleDebug = async (missionId: string) => {
    console.log('🔍 Démarrage du debug pour la mission:', missionId);
    await debugMissionAction(missionId);
    console.log('👆 Consultez les logs ci-dessus pour voir l\'analyse complète de la mission');
    alert('✅ Analyse terminée! Ouvrez la console (F12) pour voir les détails.');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'planned':
        return <Badge variant="secondary">Planifiée</Badge>;
      case 'in_progress':
        return <Badge className="bg-green-500">En cours</Badge>;
      case 'completed':
        return <Badge className="bg-blue-500">Terminée</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Annulée</Badge>;
      case 'paused':
        return <Badge className="bg-yellow-500">En pause</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getProgress = (mission: Mission) => {
    if (!mission.stops || mission.stops.length === 0) return 0;
    const completed = mission.stops.filter(s => s.status === 'completed').length;
    return Math.round((completed / mission.stops.length) * 100);
  };

  if (missions.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        Aucune {labels?.mission.toLowerCase() || 'mission'}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-2">
        {labels?.missionPlural || 'Missions'} ({missions.length})
      </h3>

      {missions.map((mission) => {
        const progress = getProgress(mission);
        const isLoading = loading === mission.id;

        return (
          <Card key={mission.id} className="p-3">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h4 className="font-medium text-sm">{mission.name}</h4>
                <p className="text-xs text-muted-foreground">
                  {mission.vehicle?.name || 'Pas de véhicule'}
                </p>
                {mission.is_optimized && (
                  <p className="text-xs text-green-600 mt-1">
                    ✓ {mission.total_distance_km} km • {mission.estimated_duration_minutes} min
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1">
                {getStatusBadge(mission.status)}
                {mission.is_optimized && (
                  <Badge variant="outline" className="text-xs bg-green-50">
                    Optimisé
                  </Badge>
                )}
              </div>
            </div>

            {/* Barre de progression */}
            {mission.status === 'in_progress' && (
              <div className="mb-2">
                <div className="flex justify-between text-xs mb-1">
                  <span>Progression</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Contrôles */}
            <div className="flex gap-1 mt-2">
              {mission.status === 'planned' && (
                <>
                  {!mission.is_optimized && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-7 text-xs"
                      onClick={() => handleOptimize(mission.id)}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Icon icon={Icons.ui.loading} size="sm" className="animate-spin" />
                      ) : (
                        <>
                          <Icon icon={Icons.optimization.optimize} size="sm" className="mr-1" />
                          Optimiser
                        </>
                      )}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2"
                    onClick={() => handleDebug(mission.id)}
                    disabled={isLoading}
                    title="Analyser la mission"
                  >
                    🔍
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    className="flex-1 h-7 text-xs"
                    onClick={() => handleStatusChange(mission.id, 'in_progress')}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Icon icon={Icons.ui.loading} size="sm" className="animate-spin" />
                    ) : (
                      <>
                        <Icon icon={Icons.time.play} size="sm" className="mr-1" />
                        Démarrer
                      </>
                    )}
                  </Button>
                </>
              )}

              {mission.status === 'in_progress' && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-7 text-xs"
                    onClick={() => handleStatusChange(mission.id, 'paused')}
                    disabled={isLoading}
                  >
                    <Icon icon={Icons.status.paused} size="sm" className="mr-1" />
                    Pause
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    className="flex-1 h-7 text-xs bg-green-600 hover:bg-green-700"
                    onClick={() => handleStatusChange(mission.id, 'completed')}
                    disabled={isLoading}
                  >
                    <Icon icon={Icons.status.completed} size="sm" className="mr-1" />
                    Terminer
                  </Button>
                </>
              )}

              {mission.status === 'paused' && (
                <Button
                  size="sm"
                  variant="default"
                  className="flex-1 h-7 text-xs"
                  onClick={() => handleStatusChange(mission.id, 'in_progress')}
                  disabled={isLoading}
                >
                  <Icon icon={Icons.time.play} size="sm" className="mr-1" />
                  Reprendre
                </Button>
              )}

              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2"
                onClick={() => handleDelete(mission.id)}
                disabled={isLoading}
              >
                <Icon icon={Icons.action.delete} size="sm" className="text-destructive" />
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
