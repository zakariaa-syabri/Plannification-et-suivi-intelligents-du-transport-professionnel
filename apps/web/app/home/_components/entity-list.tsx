'use client';

import { Card } from '@kit/ui/card';
import { Badge } from '@kit/ui/badge';
import { Icons } from '~/config/icons.config';
import { Icon, IconButton } from '~/components/ui/icon';

interface Site {
  id: string;
  name: string;
  site_type: string;
  address?: string;
  latitude: number;
  longitude: number;
}

interface Vehicle {
  id: string;
  name: string;
  vehicle_type: string;
  current_latitude?: number;
  current_longitude?: number;
}

interface Item {
  id: string;
  name: string;
  item_type: string;
  priority: string;
}

interface EntityListProps {
  sites?: Site[];
  vehicles?: Vehicle[];
  items?: Item[];
  onUpdate?: () => void;
}

export function EntityList({ sites = [], vehicles = [], items = [], onUpdate }: EntityListProps) {
  const handleDelete = async (type: 'vehicle' | 'site' | 'item', id: string) => {
    if (!confirm('Voulez-vous vraiment supprimer cet élément ?')) {
      return;
    }

    try {
      let result;
      if (type === 'vehicle') {
        const { deleteVehicleAction } = await import('../_actions/delete-entity.action');
        result = await deleteVehicleAction(id);
      } else if (type === 'site') {
        const { deleteSiteAction } = await import('../_actions/delete-entity.action');
        result = await deleteSiteAction(id);
      } else {
        const { deleteItemAction } = await import('../_actions/delete-entity.action');
        result = await deleteItemAction(id);
      }

      if (result.success) {
        onUpdate?.();
      } else {
        alert('Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la suppression');
    }
  };
  return (
    <div className="space-y-4">
      {/* Véhicules */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Icon icon={Icons.vehicle.fleet} size="sm" />
            Véhicules ({vehicles.length})
          </h3>
        </div>
        <div className="space-y-2">
          {vehicles.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Aucun véhicule</p>
          ) : (
            vehicles.map((vehicle) => (
              <Card key={vehicle.id} className="p-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded bg-blue-100 dark:bg-blue-900/20">
                      <Icon icon={Icons.vehicle.bus} size="sm" className="text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{vehicle.name}</p>
                      <p className="text-xs text-muted-foreground">{vehicle.vehicle_type}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <IconButton
                      icon={Icons.action.delete}
                      size="xs"
                      variant="ghost"
                      onClick={() => handleDelete('vehicle', vehicle.id)}
                    />
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Sites */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Icon icon={Icons.location.location} size="sm" />
            Sites ({sites.length})
          </h3>
        </div>
        <div className="space-y-2">
          {sites.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Aucun site</p>
          ) : (
            sites.map((site) => (
              <Card key={site.id} className="p-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded bg-green-100 dark:bg-green-900/20">
                      <Icon icon={Icons.location.pinned} size="sm" className="text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{site.name}</p>
                      <p className="text-xs text-muted-foreground">{site.site_type}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <IconButton
                      icon={Icons.action.delete}
                      size="xs"
                      variant="ghost"
                      onClick={() => handleDelete('site', site.id)}
                    />
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Items */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Icon icon={Icons.cargo.cargo} size="sm" />
            Items ({items.length})
          </h3>
        </div>
        <div className="space-y-2">
          {items.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Aucun item</p>
          ) : (
            items.map((item) => (
              <Card key={item.id} className="p-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded bg-orange-100 dark:bg-orange-900/20">
                      <Icon icon={Icons.cargo.package} size="sm" className="text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{item.name}</p>
                      <div className="flex items-center gap-1">
                        <p className="text-xs text-muted-foreground">{item.item_type}</p>
                        <Badge variant={item.priority === 'urgent' ? 'destructive' : 'secondary'} className="text-xs px-1 py-0">
                          {item.priority}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <IconButton
                      icon={Icons.action.delete}
                      size="xs"
                      variant="ghost"
                      onClick={() => handleDelete('item', item.id)}
                    />
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
