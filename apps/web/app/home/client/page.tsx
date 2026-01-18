'use client';

/**
 * CLIENT/PASSENGER DASHBOARD
 * Interface pour les clients/passagers
 * Affiche les livraisons/trajets et permet de suivre en temps réel
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

interface Delivery {
  id: string;
  name: string;
  item_type: string;
  status: string;
  priority: string;
  description: string | null;
  estimated_delivery_time: string | null;
  created_at: string;
  [key: string]: any;
}

interface Notification {
  id: string;
  notification_type: string;
  title: string;
  message: string | null;
  is_read: boolean;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  pending: { label: 'En attente', color: 'bg-gray-100 text-gray-800', icon: 'clock' },
  assigned: { label: 'Assigné', color: 'bg-blue-100 text-blue-800', icon: 'user' },
  in_transit: { label: 'En transit', color: 'bg-yellow-100 text-yellow-800', icon: 'truck' },
  delivered: { label: 'Livré', color: 'bg-green-100 text-green-800', icon: 'check' },
  cancelled: { label: 'Annulé', color: 'bg-red-100 text-red-800', icon: 'x' },
};

export default function ClientDashboard() {
  const { profile, isClient, isLoading: roleLoading } = useUserRole();
  const { labels } = useVocabulary();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [activeTab, setActiveTab] = useState<'deliveries' | 'notifications'>('deliveries');

  useEffect(() => {
    // Charger même sans profile pour visualisation
    loadData();
    // Abonner aux notifications en temps réel
    const unsubscribe = subscribeToNotifications();
    return unsubscribe;
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([loadDeliveries(), loadNotifications()]);
    } catch (err) {
      console.error('Erreur lors du chargement des données:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDeliveries = async () => {
    // Temporairement désactivé pour visualisation
    // if (!profile?.user_id) return;

    const supabase = getSupabaseBrowserClient();

    try {
      // Récupérer les items liés à cet utilisateur (en tant que destinataire)
      const { data, error } = await supabase
        .from('items')
        .select('*')
        // Temporairement commenté pour visualisation - récupérer tous les items
        // .or(`recipient_user_id.eq.${profile?.user_id},metadata->>client_id.eq.${profile?.user_id}`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        if (error.message.includes('does not exist')) {
          throw new Error('⚠️ Erreur: Colonnes introuvables dans la table items. Vérifier le schema.');
        }
        throw error;
      }
      setDeliveries(data || []);
    } catch (err: any) {
      console.error('Erreur chargement livraisons:', err);
      const errorMsg = err?.message || JSON.stringify(err) || 'Erreur lors du chargement des livraisons';
      console.error('Détails erreur livraisons:', errorMsg);
      if (errorMsg.includes('does not exist')) {
        setLoadError('⚠️ Erreur: Colonnes introuvables dans la table items. Vérifier le schema.');
      } else {
        setLoadError(errorMsg);
      }
    }
  };

  const loadNotifications = async () => {
    // Temporairement désactivé pour visualisation
    // if (!profile?.user_id) return;

    const supabase = getSupabaseBrowserClient();

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        // Temporairement commenté pour visualisation - charger toutes les notifications
        // .eq('user_id', profile.user_id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setNotifications(data || []);
    } catch (err) {
      console.error('Erreur chargement notifications:', err);
    }
  };

  const subscribeToNotifications = () => {
    const supabase = getSupabaseBrowserClient();

    const subscription = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          // Temporairement commenté pour visualisation
          // filter: `user_id=eq.${profile?.user_id}`,
        },
        (payload) => {
          setNotifications(prev => [payload.new as Notification, ...prev]);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const markNotificationAsRead = async (notificationId: string) => {
    const supabase = getSupabaseBrowserClient();

    try {
      await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
    } catch (err) {
      console.error('Erreur marquage notification:', err);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

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
            <Button onClick={loadData}>Réessayer</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
          <h1 className="text-xl font-bold">Mon espace</h1>
          <p className="text-sm text-muted-foreground">
            Bienvenue, {profile?.display_name || 'Client'}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            className={`flex-1 py-3 text-center font-medium transition-colors ${
              activeTab === 'deliveries'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground'
            }`}
            onClick={() => setActiveTab('deliveries')}
          >
            Mes {labels.itemPlural}
          </button>
          <button
            className={`flex-1 py-3 text-center font-medium transition-colors relative ${
              activeTab === 'notifications'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground'
            }`}
            onClick={() => setActiveTab('notifications')}
          >
            Notifications
            {unreadCount > 0 && (
              <span className="absolute top-2 right-1/4 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Contenu */}
      <div className="p-4">
        {activeTab === 'deliveries' ? (
          <div className="space-y-4">
            {deliveries.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <Icon icon={Icons.cargo.cargo} size="xl" className="mx-auto mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Aucun {labels.item.toLowerCase()} en cours
                  </p>
                </CardContent>
              </Card>
            ) : (
              deliveries.map((delivery) => (
                <Card
                  key={delivery.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedDelivery(delivery)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{delivery.name}</CardTitle>
                      <Badge className={STATUS_CONFIG[delivery.status]?.color}>
                        {STATUS_CONFIG[delivery.status]?.label || delivery.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="text-muted-foreground">
                        {delivery.description || 'Pas de description'}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <Icon icon={Icons.ui.bell} size="xl" className="mx-auto mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Aucune notification
                  </p>
                </CardContent>
              </Card>
            ) : (
              notifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={`cursor-pointer transition-all ${
                    !notification.is_read ? 'border-primary bg-primary/5' : ''
                  }`}
                  onClick={() => markNotificationAsRead(notification.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-full ${
                        !notification.is_read ? 'bg-primary/10' : 'bg-muted'
                      }`}>
                        <Icon
                          icon={Icons.ui.bell}
                          size="sm"
                          className={!notification.is_read ? 'text-primary' : 'text-muted-foreground'}
                        />
                      </div>
                      <div className="flex-1">
                        <p className={`font-medium ${!notification.is_read ? 'text-primary' : ''}`}>
                          {notification.title}
                        </p>
                        {notification.message && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {notification.message}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(notification.created_at).toLocaleString('fr-FR')}
                        </p>
                      </div>
                      {!notification.is_read && (
                        <div className="w-2 h-2 rounded-full bg-primary" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>

      {/* Modal détail livraison */}
      {selectedDelivery && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center">
          <div className="bg-background w-full md:max-w-lg md:rounded-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-background border-b p-4 flex items-center justify-between">
              <h2 className="font-semibold">{selectedDelivery.name}</h2>
              <Button variant="ghost" size="sm" onClick={() => setSelectedDelivery(null)}>
                <Icon icon={Icons.ui.close} size="sm" />
              </Button>
            </div>

            <div className="p-4 space-y-4">
              {/* Statut avec timeline */}
              <div className="space-y-3">
                <h3 className="font-medium">Suivi</h3>
                <div className="flex items-center justify-between">
                  {['pending', 'assigned', 'in_transit', 'delivered'].map((status, index) => {
                    const isActive = ['pending', 'assigned', 'in_transit', 'delivered']
                      .indexOf(selectedDelivery.status) >= index;
                    return (
                      <div key={status} className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                        }`}>
                          {index + 1}
                        </div>
                        <span className="text-xs mt-1 text-center">
                          {STATUS_CONFIG[status]?.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Détails */}
              <div className="space-y-3">
                <h3 className="font-medium">Détails</h3>
                {selectedDelivery.description && (
                  <p className="text-sm text-muted-foreground">
                    {selectedDelivery.description}
                  </p>
                )}
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type</span>
                    <span>{selectedDelivery.item_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Priorité</span>
                    <span>{selectedDelivery.priority}</span>
                  </div>
                  {/* Vehicle info removed - requires relationship data */}
                </div>
              </div>

              {/* Addresses info removed - requires relationship data */}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
