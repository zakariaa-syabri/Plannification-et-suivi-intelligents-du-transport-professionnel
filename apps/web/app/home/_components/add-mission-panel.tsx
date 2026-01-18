'use client';

/**
 * Panel pour créer une mission
 * Workflow simplifié: véhicule → éléments à collecter → destination
 */

import { useState, useEffect } from 'react';
import { Button } from '@kit/ui/button';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import { Card } from '@kit/ui/card';
import { Badge } from '@kit/ui/badge';
import { Icons } from '~/config/icons.config';
import { Icon } from '~/components/ui/icon';
import { getSupabaseBrowserClient } from '@kit/supabase/browser-client';
import { createMissionAction, MissionStop } from '../_actions/mission.action';
import { optimizeMissionAction } from '../_actions/optimization.action';
import { getOrganizationConfigAction } from '../_actions/organization-config.action';
import type { OrganizationConfig } from '~/config/element-types.config';

interface Vehicle {
  id: string;
  name: string;
  vehicle_type: string;
}

interface Site {
  id: string;
  name: string;
  site_type: string;
  address?: string;
}

interface Item {
  id: string;
  name: string;
  item_type: string;
  pickup_site_id?: string;
  pickup_site?: {
    id: string;
    name: string;
  };
}

interface AddMissionPanelProps {
  onClose: () => void;
  onDataChange?: () => void | Promise<void>;
}

export function AddMissionPanel({ onClose, onDataChange }: AddMissionPanelProps) {
  const [config, setConfig] = useState<OrganizationConfig | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [missionName, setMissionName] = useState('');
  const [missionDescription, setMissionDescription] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [plannedDate, setPlannedDate] = useState(new Date().toISOString().split('T')[0]);
  const [plannedTime, setPlannedTime] = useState('08:00');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [destinationSite, setDestinationSite] = useState<string>('');

  // Charger les données au montage
  useEffect(() => {
    async function loadData() {
      const supabase = getSupabaseBrowserClient();
      const orgId = localStorage.getItem('current_organization_id');

      if (!orgId) {
        setLoading(false);
        return;
      }

      // Charger la config
      const configResult = await getOrganizationConfigAction(orgId);
      if (configResult.success && configResult.data) {
        setConfig(configResult.data);
      }

      // Charger les véhicules
      const { data: vehiclesData } = await supabase
        .from('vehicles')
        .select('id, name, vehicle_type')
        .eq('organization_id', orgId);

      if (vehiclesData) {
        setVehicles(vehiclesData);
      }

      // Charger les sites
      const { data: sitesData } = await supabase
        .from('sites')
        .select('id, name, site_type, address')
        .eq('organization_id', orgId);

      if (sitesData) {
        setSites(sitesData);
      }

      // Charger les items avec leur site de pickup
      // FILTRER: Seulement les items disponibles (status = pending)
      // Les items assigned, in_transit ou delivered ne sont pas disponibles
      const { data: itemsData } = await supabase
        .from('items')
        .select(`
          id,
          name,
          item_type,
          pickup_site_id,
          status,
          pickup_site:sites!items_pickup_site_id_fkey(id, name)
        `)
        .eq('organization_id', orgId)
        .eq('status', 'pending');

      if (itemsData) {
        setItems(itemsData);
        console.log(`✅ Panel mission: ${itemsData.length} items disponibles (status: pending)`);
      }

      setLoading(false);
    }

    loadData();
  }, []);

  // Obtenir les sites de pickup uniques des items sélectionnés
  const getPickupSites = () => {
    const pickupSiteIds = new Set<string>();
    selectedItems.forEach(itemId => {
      const item = items.find(i => i.id === itemId);
      if (item?.pickup_site_id) {
        pickupSiteIds.add(item.pickup_site_id);
      }
    });
    return Array.from(pickupSiteIds);
  };

  // Soumettre la mission
  const handleSubmit = async () => {
    setError(null);

    if (!missionName.trim()) {
      setError('Le nom de la mission est requis');
      return;
    }

    if (!selectedVehicle) {
      setError(`Veuillez sélectionner un ${config?.labels.vehicle.toLowerCase() || 'véhicule'}`);
      return;
    }

    if (selectedItems.length === 0) {
      setError(`Veuillez sélectionner au moins un ${config?.labels.item.toLowerCase() || 'élément'} à transporter`);
      return;
    }

    if (!destinationSite) {
      setError('Veuillez sélectionner une destination');
      return;
    }

    setIsSubmitting(true);

    const orgId = localStorage.getItem('current_organization_id');
    if (!orgId) {
      setError('Organisation non trouvée');
      setIsSubmitting(false);
      return;
    }

    // Construire automatiquement les stops
    const pickupSiteIds = getPickupSites();
    const stops: MissionStop[] = [];

    // Ajouter les sites de pickup
    pickupSiteIds.forEach((siteId, index) => {
      // Trouver les items à collecter à ce site
      const itemsAtSite = selectedItems.filter(itemId => {
        const item = items.find(i => i.id === itemId);
        return item?.pickup_site_id === siteId;
      });

      stops.push({
        site_id: siteId,
        order: index + 1,
        type: 'pickup',
        item_ids: itemsAtSite,
      });
    });

    // Ajouter la destination finale
    stops.push({
      site_id: destinationSite,
      order: stops.length + 1,
      type: 'dropoff',
      item_ids: selectedItems,
    });

    if (stops.length < 2) {
      setError('La mission doit avoir au moins un point de collecte et une destination');
      setIsSubmitting(false);
      return;
    }

    // Créer la mission
    const result = await createMissionAction({
      organization_id: orgId,
      name: missionName,
      description: missionDescription,
      vehicle_id: selectedVehicle,
      route_type: 'delivery',
      planned_date: plannedDate,
      planned_start_time: plannedTime,
      stops: stops,
      assigned_items_ids: selectedItems,
    });

    if (result.success && result.data) {
      // Optimiser automatiquement la route
      await optimizeMissionAction(result.data.id, {
        startTime: plannedTime,
      });

      setIsSubmitting(false);

      // Actualiser les données au lieu de recharger toute la page
      if (onDataChange) {
        await onDataChange();
        console.log('✅ Mission créée et données actualisées');
      }

      onClose();
    } else {
      setError(result.error || 'Erreur lors de la création');
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Icon icon={Icons.ui.loading} className="animate-spin" size="lg" />
      </div>
    );
  }

  const pickupSiteIds = getPickupSites();
  const pickupSiteNames = pickupSiteIds.map(id => sites.find(s => s.id === id)?.name).filter(Boolean);

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Nom de la mission */}
      <div className="space-y-2">
        <Label>Nom de la {config?.labels.mission.toLowerCase() || 'mission'} *</Label>
        <Input
          value={missionName}
          onChange={(e) => setMissionName(e.target.value)}
          placeholder={`Ex: Livraison du ${plannedDate}`}
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label>Description</Label>
        <textarea
          className="w-full p-2 border rounded-md text-sm"
          rows={2}
          value={missionDescription}
          onChange={(e) => setMissionDescription(e.target.value)}
          placeholder="Description optionnelle..."
        />
      </div>

      {/* Date et heure */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Date prévue *</Label>
          <Input
            type="date"
            value={plannedDate}
            onChange={(e) => setPlannedDate(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Heure de départ</Label>
          <Input
            type="time"
            value={plannedTime}
            onChange={(e) => setPlannedTime(e.target.value)}
          />
        </div>
      </div>

      {/* Sélection du véhicule */}
      <div className="space-y-2">
        <Label>
          {config?.labels.vehicle || 'Véhicule'} *
        </Label>
        {vehicles.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun {config?.labels.vehicle.toLowerCase() || 'véhicule'} disponible
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {vehicles.map((vehicle) => (
              <Card
                key={vehicle.id}
                className={`p-3 cursor-pointer transition-all ${
                  selectedVehicle === vehicle.id
                    ? 'border-primary ring-2 ring-primary/20'
                    : 'hover:border-primary/50'
                }`}
                onClick={() => setSelectedVehicle(vehicle.id)}
              >
                <div className="flex items-center gap-2">
                  <Icon icon={Icons.vehicle.vehicle} size="sm" />
                  <span className="text-sm font-medium truncate">{vehicle.name}</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Sélection des éléments à transporter */}
      <div className="space-y-2">
        <Label>
          {config?.labels.itemPlural || 'Éléments'} à transporter *
        </Label>
        <p className="text-xs text-muted-foreground mb-2">
          Le véhicule collectera ces éléments à leurs emplacements
        </p>
        {items.length === 0 ? (
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              Aucun {config?.labels.item.toLowerCase() || 'élément'} disponible pour une nouvelle mission.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Les items déjà assignés à une mission, en transit ou livrés ne sont pas affichés.
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {items.map((item) => {
              const isSelected = selectedItems.includes(item.id);
              return (
                <Badge
                  key={item.id}
                  variant={isSelected ? 'default' : 'outline'}
                  className={`cursor-pointer ${isSelected ? '' : 'hover:bg-primary/10'}`}
                  onClick={() => {
                    if (isSelected) {
                      setSelectedItems(selectedItems.filter(id => id !== item.id));
                    } else {
                      setSelectedItems([...selectedItems, item.id]);
                    }
                  }}
                >
                  <span>{item.name}</span>
                  {item.pickup_site && (
                    <span className="ml-1 text-xs opacity-70">
                      @ {item.pickup_site.name}
                    </span>
                  )}
                  {isSelected && <span className="ml-1">✓</span>}
                </Badge>
              );
            })}
          </div>
        )}
      </div>

      {/* Sélection de la destination */}
      <div className="space-y-2">
        <Label>
          Destination finale *
        </Label>
        <p className="text-xs text-muted-foreground mb-2">
          Où livrer les {config?.labels.itemPlural.toLowerCase() || 'éléments'}
        </p>
        {sites.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun {config?.labels.site.toLowerCase() || 'site'} disponible
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {sites.map((site) => {
              const isPickupSite = pickupSiteIds.includes(site.id);
              return (
                <Card
                  key={site.id}
                  className={`p-3 cursor-pointer transition-all ${
                    destinationSite === site.id
                      ? 'border-primary ring-2 ring-primary/20'
                      : isPickupSite
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => {
                    if (!isPickupSite) {
                      setDestinationSite(site.id);
                    }
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Icon icon={Icons.location.location} size="sm" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium truncate block">{site.name}</span>
                      {isPickupSite && (
                        <span className="text-xs text-muted-foreground">Point de collecte</span>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Résumé */}
      {selectedItems.length > 0 && destinationSite && selectedVehicle && (
        <Card className="p-4 bg-muted">
          <div className="text-sm font-medium mb-2">Résumé de la mission :</div>
          <ul className="text-sm space-y-1">
            <li className="flex items-start gap-2">
              <span className="text-blue-500">🚗</span>
              <span>{vehicles.find(v => v.id === selectedVehicle)?.name}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500">📦</span>
              <span>{selectedItems.length} {config?.labels.itemPlural.toLowerCase() || 'éléments'} à collecter</span>
            </li>
            {pickupSiteNames.length > 0 && (
              <li className="flex items-start gap-2">
                <span className="text-yellow-500">📍</span>
                <span>Collecte: {pickupSiteNames.join(', ')}</span>
              </li>
            )}
            <li className="flex items-start gap-2">
              <span className="text-green-500">🎯</span>
              <span>Destination: {sites.find(s => s.id === destinationSite)?.name}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-500">📅</span>
              <span>{plannedDate} à {plannedTime}</span>
            </li>
          </ul>
          <p className="text-xs text-muted-foreground mt-3 italic">
            La route sera optimisée automatiquement
          </p>
        </Card>
      )}

      {/* Boutons */}
      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="flex-1"
          disabled={isSubmitting}
        >
          Annuler
        </Button>
        <Button
          onClick={handleSubmit}
          className="flex-1"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Icon icon={Icons.ui.loading} size="sm" className="mr-2 animate-spin" />
              Création...
            </>
          ) : (
            <>
              <Icon icon={Icons.action.add} size="sm" className="mr-2" />
              Créer & Optimiser
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
