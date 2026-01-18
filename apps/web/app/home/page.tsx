'use client';

/**
 * MAP BUILDER - Page Principale
 * Interface interactive pour construire son système de transport
 */

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { getSupabaseBrowserClient } from '@kit/supabase/browser-client';
import { Card } from '@kit/ui/card';
import { Button } from '@kit/ui/button';
import { Icons } from '~/config/icons.config';
import { Icon } from '~/components/ui/icon';
import { AddVehiclePanel } from './_components/add-vehicle-panel';
import { AddSitePanel } from './_components/add-site-panel';
import { AddItemPanel } from './_components/add-item-panel';
import { AddMissionPanel } from './_components/add-mission-panel';
import { EntityList } from './_components/entity-list';
import { MissionList } from './_components/mission-list';
import { VerificationPanel } from './_components/verification-panel';
import { FirstTimeWelcome } from './_components/first-time-welcome';
import { getOrganizationConfigAction } from './_actions/organization-config.action';
import type { OrganizationConfig } from '~/config/element-types.config';

// Import dynamique de la carte (client-side only)
const MapCanvas = dynamic(() => import('./_components/map-canvas'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-muted">
      <div className="text-center">
        <Icon icon={Icons.ui.loading} size="xl" className="animate-spin mb-2" />
        <p>Chargement de la carte...</p>
      </div>
    </div>
  ),
});

type PanelType = 'vehicle' | 'site' | 'item' | 'mission' | null;

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
  pickup_site_id?: string;
  pickup_latitude?: number;
  pickup_longitude?: number;
}

export default function MapBuilderPage() {
  const [activePanel, setActivePanel] = useState<PanelType>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([48.8566, 2.3522]); // Paris par défaut
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [missions, setMissions] = useState<any[]>([]);
  const [config, setConfig] = useState<OrganizationConfig | null>(null);

  // Charger l'organization_id et les données au montage
  useEffect(() => {
    async function loadData() {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: membership } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('user_id', user.id)
          .single();

        if (membership) {
          const orgId = membership.organization_id;
          setOrganizationId(orgId);
          localStorage.setItem('current_organization_id', orgId);

          // Charger la configuration
          const configResult = await getOrganizationConfigAction(orgId);
          if (configResult.success && configResult.data) {
            setConfig(configResult.data);
            // Utiliser le centre par défaut de la config si disponible
            if (configResult.data.settings.defaultMapCenter) {
              setMapCenter(configResult.data.settings.defaultMapCenter);
            }
          }

          // Charger les sites
          const { data: sitesData } = await supabase
            .from('sites')
            .select('id, name, site_type, address, latitude, longitude')
            .eq('organization_id', orgId);

          if (sitesData) {
            setSites(sitesData);
            // Centrer la carte sur le premier site si disponible
            if (sitesData.length > 0) {
              setMapCenter([sitesData[0].latitude, sitesData[0].longitude]);
            }
          }

          // Charger les véhicules
          const { data: vehiclesData } = await supabase
            .from('vehicles')
            .select('id, name, vehicle_type, current_latitude, current_longitude')
            .eq('organization_id', orgId);

          if (vehiclesData) {
            setVehicles(vehiclesData);
          }

          // Charger les items avec leurs coordonnées de pickup
          // FILTRER: Ne montrer que les items non livrés (pending, assigned)
          const { data: itemsData } = await supabase
            .from('items')
            .select(`
              id,
              name,
              item_type,
              priority,
              pickup_site_id,
              status,
              pickup_site:sites!items_pickup_site_id_fkey(latitude, longitude)
            `)
            .eq('organization_id', orgId)
            .in('status', ['pending', 'assigned']); // Ne pas montrer les items en transit ou livrés

          if (itemsData) {
            // Transformer les données pour ajouter les coordonnées du site de pickup
            const itemsWithCoords = itemsData.map((item: any) => ({
              id: item.id,
              name: item.name,
              item_type: item.item_type,
              priority: item.priority,
              pickup_site_id: item.pickup_site_id,
              pickup_latitude: item.pickup_site?.latitude,
              pickup_longitude: item.pickup_site?.longitude,
            }));
            setItems(itemsWithCoords);
          }

          // Charger les missions avec leurs stops
          const { data: missionsData } = await supabase
            .from('routes')
            .select(`
              *,
              vehicle:vehicles(id, name, vehicle_type, current_latitude, current_longitude),
              stops:route_stops(
                id,
                site_id,
                sequence_order,
                stop_type,
                status,
                planned_arrival_time,
                site:sites(id, name, latitude, longitude)
              )
            `)
            .eq('organization_id', orgId)
            .order('created_at', { ascending: false })
            .order('sequence_order', { foreignTable: 'route_stops', ascending: true });

          if (missionsData) {
            setMissions(missionsData);
          }
        }
      }
    }

    loadData();
  }, []);

  const openPanel = (panel: PanelType) => {
    setActivePanel(panel);
  };

  const closePanel = () => {
    setActivePanel(null);
  };

  // Fonction pour recharger toutes les données sans recharger la page
  const reloadData = async () => {
    if (!organizationId) return;

    const supabase = getSupabaseBrowserClient();

    try {
      // Recharger les sites
      const { data: sitesData } = await supabase
        .from('sites')
        .select('id, name, site_type, address, latitude, longitude')
        .eq('organization_id', organizationId);

      if (sitesData) {
        setSites(sitesData);
      }

      // Recharger les véhicules
      const { data: vehiclesData } = await supabase
        .from('vehicles')
        .select('id, name, vehicle_type, current_latitude, current_longitude')
        .eq('organization_id', organizationId);

      if (vehiclesData) {
        setVehicles(vehiclesData);
      }

      // Recharger les items (FILTRER: seulement ceux non livrés)
      const { data: itemsData } = await supabase
        .from('items')
        .select(`
          id,
          name,
          item_type,
          priority,
          pickup_site_id,
          status,
          pickup_site:sites!items_pickup_site_id_fkey(latitude, longitude)
        `)
        .eq('organization_id', organizationId)
        .in('status', ['pending', 'assigned']); // Ne montrer que les items non livrés

      if (itemsData) {
        const itemsWithCoords = itemsData.map((item: any) => ({
          id: item.id,
          name: item.name,
          item_type: item.item_type,
          priority: item.priority,
          pickup_site_id: item.pickup_site_id,
          pickup_latitude: item.pickup_site?.latitude,
          pickup_longitude: item.pickup_site?.longitude,
        }));
        setItems(itemsWithCoords);
      }

      // Recharger les missions
      const { data: missionsData } = await supabase
        .from('routes')
        .select(`
          *,
          vehicle:vehicles(id, name, vehicle_type, current_latitude, current_longitude),
          stops:route_stops(
            id,
            site_id,
            sequence_order,
            stop_type,
            status,
            planned_arrival_time,
            site:sites(id, name, latitude, longitude)
          )
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .order('sequence_order', { foreignTable: 'route_stops', ascending: true });

      if (missionsData) {
        setMissions(missionsData);
      }

      console.log('✅ Données rechargées avec succès');
    } catch (error) {
      console.error('Erreur rechargement données:', error);
    }
  };

  return (
    <div className="h-screen w-full flex flex-col">
      {/* Header */}
      <div className="bg-background border-b px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Map Builder</h1>
          <p className="text-sm text-muted-foreground">
            Construisez votre système de transport visuellement
          </p>
        </div>

        {/* Panneau de vérification du système */}
        {organizationId && <VerificationPanel organizationId={organizationId} />}
      </div>

      {/* Message de bienvenue première fois */}
      <div className="bg-background border-b px-4 py-4">
        <FirstTimeWelcome />
      </div>

      {/* Corps principal */}
      <div className="flex-1 flex overflow-hidden">
        {/* Panel Gauche - Outils d'ajout */}
        <div className="w-80 border-r bg-background overflow-y-auto">
          <div className="p-4 space-y-3">
            <div>
              <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase">
                Ajouter des éléments
              </h2>

              <div className="space-y-2">
                {/* Bouton Ajouter Véhicule */}
                <Card
                  className="p-4 cursor-pointer hover:border-primary transition-all"
                  onClick={() => openPanel('vehicle')}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/20">
                      <Icon
                        icon={Icons.vehicle.fleet}
                        size="lg"
                        className="text-blue-600 dark:text-blue-400"
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{config?.labels.vehiclePlural || 'Véhicules'}</h3>
                      <p className="text-xs text-muted-foreground">
                        Moyens de transport
                      </p>
                    </div>
                    <Icon icon={Icons.ui.right} size="sm" className="text-muted-foreground" />
                  </div>
                </Card>

                {/* Bouton Ajouter Site */}
                <Card
                  className="p-4 cursor-pointer hover:border-primary transition-all"
                  onClick={() => openPanel('site')}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/20">
                      <Icon
                        icon={Icons.location.location}
                        size="lg"
                        className="text-green-600 dark:text-green-400"
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{config?.labels.sitePlural || 'Sites'}</h3>
                      <p className="text-xs text-muted-foreground">
                        Points sur la carte
                      </p>
                    </div>
                    <Icon icon={Icons.ui.right} size="sm" className="text-muted-foreground" />
                  </div>
                </Card>

                {/* Bouton Ajouter Item */}
                <Card
                  className="p-4 cursor-pointer hover:border-primary transition-all"
                  onClick={() => openPanel('item')}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/20">
                      <Icon
                        icon={Icons.cargo.cargo}
                        size="lg"
                        className="text-orange-600 dark:text-orange-400"
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{config?.labels.itemPlural || 'Items'}</h3>
                      <p className="text-xs text-muted-foreground">
                        Éléments à transporter
                      </p>
                    </div>
                    <Icon icon={Icons.ui.right} size="sm" className="text-muted-foreground" />
                  </div>
                </Card>

                {/* Bouton Créer Mission */}
                <Card
                  className="p-4 cursor-pointer hover:border-primary transition-all border-dashed"
                  onClick={() => openPanel('mission')}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/20">
                      <Icon
                        icon={Icons.mission.route}
                        size="lg"
                        className="text-purple-600 dark:text-purple-400"
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{config?.labels.mission || 'Mission'}</h3>
                      <p className="text-xs text-muted-foreground">
                        Créer un itinéraire
                      </p>
                    </div>
                    <Icon icon={Icons.ui.right} size="sm" className="text-muted-foreground" />
                  </div>
                </Card>
              </div>
            </div>

            {/* Liste des entités */}
            <div className="pt-4 border-t">
              <EntityList sites={sites} vehicles={vehicles} items={items} onUpdate={reloadData} />
            </div>

            {/* Liste des missions */}
            {missions.length > 0 && (
              <div className="pt-4 border-t">
                <MissionList
                  missions={missions}
                  onUpdate={reloadData}
                  labels={config?.labels ? {
                    mission: config.labels.mission,
                    missionPlural: config.labels.missionPlural
                  } : undefined}
                />
              </div>
            )}
          </div>
        </div>

        {/* Carte centrale */}
        <div className="flex-1 relative">
          <MapCanvas
            center={mapCenter}
            sites={sites}
            vehicles={vehicles}
            items={items}
            missions={missions}
            onDataChange={reloadData}
          />
        </div>

        {/* Panel latéral droit (dynamique) */}
        {activePanel && (
          <div className="w-96 border-l bg-background overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">
                  {activePanel === 'vehicle' && `Ajouter un ${config?.labels.vehicle.toLowerCase() || 'véhicule'}`}
                  {activePanel === 'site' && `Ajouter un ${config?.labels.site.toLowerCase() || 'site'}`}
                  {activePanel === 'item' && `Ajouter un ${config?.labels.item.toLowerCase() || 'item'}`}
                  {activePanel === 'mission' && `Créer une ${config?.labels.mission.toLowerCase() || 'mission'}`}
                </h2>
                <Button variant="ghost" size="sm" onClick={closePanel}>
                  <Icon icon={Icons.ui.close} size="sm" />
                </Button>
              </div>

              {activePanel === 'vehicle' && <AddVehiclePanel onClose={closePanel} />}
              {activePanel === 'site' && <AddSitePanel onClose={closePanel} />}
              {activePanel === 'item' && <AddItemPanel onClose={closePanel} />}
              {activePanel === 'mission' && <AddMissionPanel onClose={closePanel} onDataChange={reloadData} />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
