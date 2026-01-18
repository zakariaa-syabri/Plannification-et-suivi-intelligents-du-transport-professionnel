'use client';

/**
 * Composant Carte Interactive
 * Utilise React Leaflet pour afficher une carte style Google Maps
 */

import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Icon as LeafletIcon, divIcon } from 'leaflet';
import { useEffect, useState, useRef, useCallback } from 'react';
import { updateMissionStatusAction } from '../_actions/mission.action';
import { fetchMissionRoute, RouteCoordinate } from '../_utils/routing';
import { SiteDetailsModal } from './site-details-modal';
import {
  pickupItemsFromSiteAction,
  dropoffItemsAtSiteAction,
  startMissionAction,
  completeMissionAction,
} from '../_actions/transport-simulation.action';

// Fix pour les icônes Leaflet avec Next.js
delete (LeafletIcon.Default.prototype as any)._getIconUrl;
LeafletIcon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Icônes personnalisées pour les sites selon le type
const getSiteIcon = (siteType: string) => {
  const icons: Record<string, string> = {
    depot: '🏭',
    school: '🏫',
    warehouse: '🏢',
    station: '🚉',
    hospital: '🏥',
    office: '🏢',
    store: '🏪',
    factory: '🏭',
  };

  const emoji = icons[siteType] || '📍';

  return divIcon({
    className: 'custom-site-marker',
    html: `
      <div style="
        background-color: #10b981;
        width: 38px;
        height: 38px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <span style="transform: rotate(45deg); font-size: 18px;">${emoji}</span>
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 38],
    popupAnchor: [0, -38],
  });
};

// Icônes personnalisées pour les véhicules selon le type
const getVehicleIcon = (vehicleType: string) => {
  const icons: Record<string, string> = {
    bus: '🚌',
    truck: '🚚',
    van: '🚐',
    car: '🚗',
    train: '🚆',
    plane: '✈️',
  };

  const emoji = icons[vehicleType] || '🚗';

  return divIcon({
    className: 'custom-vehicle-marker',
    html: `
      <div style="
        background-color: #3b82f6;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <span style="font-size: 18px;">${emoji}</span>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
};

// Icônes personnalisées pour les items selon le type
const getItemIcon = (itemType: string, priority: string) => {
  const icons: Record<string, string> = {
    student: '👨‍🎓',
    parcel: '📦',
    passenger: '🧑',
    cargo: '📦',
    mail: '✉️',
    food: '🍱',
    medical: '💊',
  };

  const emoji = icons[itemType] || '📦';
  const bgColor = priority === 'urgent' ? '#ef4444' : '#f97316';

  return divIcon({
    className: 'custom-item-marker',
    html: `
      <div style="
        background-color: ${bgColor};
        width: 30px;
        height: 30px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <span style="font-size: 14px;">${emoji}</span>
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
  });
};

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

interface MissionStop {
  id: string;
  site_id: string;
  sequence_order: number;
  stop_type: string;
  status: string;
  site?: {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
  };
}

interface Mission {
  id: string;
  name: string;
  status: string;
  vehicle_id: string;
  vehicle?: {
    id: string;
    name: string;
    vehicle_type: string;
    current_latitude?: number;
    current_longitude?: number;
  };
  stops?: MissionStop[];
}

interface MapCanvasProps {
  center: [number, number];
  zoom?: number;
  sites?: Site[];
  vehicles?: Vehicle[];
  items?: Item[];
  missions?: Mission[];
  activeMissionId?: string;
  onDataChange?: () => void | Promise<void>;
}

function MapController({ center }: { center: [number, number] }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center);
  }, [center, map]);

  return null;
}

// Composant pour afficher la route réelle d'une mission
function MissionRoute({
  mission,
  isActive
}: {
  mission: Mission;
  isActive: boolean;
}) {
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadRoute() {
      if (!mission.stops || mission.stops.length === 0) {
        setIsLoading(false);
        return;
      }

      const stops = mission.stops
        .filter(s => s.site?.latitude && s.site?.longitude)
        .sort((a, b) => a.sequence_order - b.sequence_order)
        .map(s => ({
          latitude: s.site!.latitude,
          longitude: s.site!.longitude,
        }));

      if (stops.length === 0) {
        setIsLoading(false);
        return;
      }

      // Position de départ du véhicule
      const vehiclePos = mission.vehicle?.current_latitude && mission.vehicle?.current_longitude
        ? { lat: mission.vehicle.current_latitude, lng: mission.vehicle.current_longitude }
        : null;

      try {
        const result = await fetchMissionRoute(vehiclePos, stops);

        if (result && result.coordinates.length > 0) {
          // Convertir en format Leaflet [lat, lng]
          setRouteCoords(result.coordinates.map(c => [c.lat, c.lng] as [number, number]));
        } else {
          // Fallback aux lignes droites
          const fallbackCoords: [number, number][] = [];
          if (vehiclePos) {
            fallbackCoords.push([vehiclePos.lat, vehiclePos.lng]);
          }
          stops.forEach(s => {
            fallbackCoords.push([s.latitude, s.longitude]);
          });
          setRouteCoords(fallbackCoords);
        }
      } catch (error) {
        console.error('Error loading route:', error);
        // Fallback aux lignes droites
        const fallbackCoords: [number, number][] = [];
        if (vehiclePos) {
          fallbackCoords.push([vehiclePos.lat, vehiclePos.lng]);
        }
        stops.forEach(s => {
          fallbackCoords.push([s.latitude, s.longitude]);
        });
        setRouteCoords(fallbackCoords);
      }

      setIsLoading(false);
    }

    loadRoute();
  }, [mission.id, mission.stops, mission.vehicle]);

  if (isLoading || routeCoords.length < 2) {
    return null;
  }

  const routeColor = isActive ? '#8b5cf6' : '#94a3b8';

  return (
    <Polyline
      positions={routeCoords}
      color={routeColor}
      weight={isActive ? 5 : 3}
      opacity={isActive ? 0.8 : 0.5}
      dashArray={isActive ? undefined : '5, 10'}
    />
  );
}

// Composant pour animer le véhicule le long de la route réelle
function AnimatedVehicle({
  mission,
  vehicleType,
  onItemCollected,
  onMissionComplete,
  onDataChange
}: {
  mission: Mission;
  vehicleType: string;
  onItemCollected?: (siteId: string) => void;
  onMissionComplete?: (missionId: string) => void;
  onDataChange?: () => void | Promise<void>;
}) {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [collectedSites, setCollectedSites] = useState<string[]>([]);
  const [routePoints, setRoutePoints] = useState<[number, number][]>([]);
  const lastNotifiedSiteRef = useRef<string | null>(null);

  // Notifier le parent quand un site est collecté via useEffect
  useEffect(() => {
    if (collectedSites.length > 0 && onItemCollected) {
      const lastSite = collectedSites[collectedSites.length - 1];
      if (lastSite && lastSite !== lastNotifiedSiteRef.current) {
        lastNotifiedSiteRef.current = lastSite;
        onItemCollected(lastSite);
      }
    }
  }, [collectedSites, onItemCollected]);

  // Charger la route réelle
  useEffect(() => {
    async function loadRoute() {
      if (!mission.stops || mission.stops.length === 0) return;

      const stops = mission.stops
        .filter(s => s.site?.latitude && s.site?.longitude)
        .sort((a, b) => a.sequence_order - b.sequence_order)
        .map(s => ({
          latitude: s.site!.latitude,
          longitude: s.site!.longitude,
        }));

      if (stops.length === 0) return;

      const vehiclePos = mission.vehicle?.current_latitude && mission.vehicle?.current_longitude
        ? { lat: mission.vehicle.current_latitude, lng: mission.vehicle.current_longitude }
        : null;

      try {
        const result = await fetchMissionRoute(vehiclePos, stops);
        if (result && result.coordinates.length > 0) {
          setRoutePoints(result.coordinates.map(c => [c.lat, c.lng] as [number, number]));
        }
      } catch (error) {
        console.error('Error loading route for animation:', error);
      }
    }

    loadRoute();
  }, [mission.id, mission.stops, mission.vehicle]);

  // Use refs to track animation state
  const animationRef = useRef<{
    active: boolean;
    pointIdx: number;
    initialized: boolean;
    completed: boolean;
    intervals: NodeJS.Timeout[];
    timeouts: NodeJS.Timeout[];
  }>({
    active: false,
    pointIdx: 0,
    initialized: false,
    completed: false,
    intervals: [],
    timeouts: [],
  });

  // Cleanup function
  const cleanup = useCallback(() => {
    animationRef.current.active = false;
    animationRef.current.intervals.forEach(clearInterval);
    animationRef.current.timeouts.forEach(clearTimeout);
    animationRef.current.intervals = [];
    animationRef.current.timeouts = [];
  }, []);

  // Fonction pour vérifier si on est proche d'un stop
  const isNearStop = useCallback((lat: number, lng: number, stops: MissionStop[]) => {
    const threshold = 0.0005; // Environ 50m
    for (const stop of stops) {
      if (stop.site) {
        const distance = Math.sqrt(
          Math.pow(lat - stop.site.latitude, 2) +
          Math.pow(lng - stop.site.longitude, 2)
        );
        if (distance < threshold) {
          return stop;
        }
      }
    }
    return null;
  }, []);

  useEffect(() => {
    if (!mission.stops || mission.stops.length === 0) return;
    if (mission.status !== 'in_progress') return;
    if (routePoints.length === 0) return;
    if (animationRef.current.completed) return;

    const stops = mission.stops
      .filter(s => s.site?.latitude && s.site?.longitude)
      .sort((a, b) => a.sequence_order - b.sequence_order);

    if (stops.length === 0) return;

    // Initialize
    if (!animationRef.current.initialized) {
      animationRef.current.pointIdx = 0;
      animationRef.current.initialized = true;
      setPosition(routePoints[0]);

      // Démarrer la mission (mettre les items en "assigned")
      startMissionAction(mission.id).then(result => {
        if (result.success) {
          console.log('🚀 Mission démarrée:', mission.name);
        }
      });
    }

    animationRef.current.active = true;
    let collectedStopIds = new Set<string>();

    const animate = () => {
      if (!animationRef.current.active) return;

      const { pointIdx } = animationRef.current;

      if (pointIdx >= routePoints.length) {
        // Animation terminée
        animationRef.current.completed = true;
        animationRef.current.active = false;

        // Terminer la mission (marquer tous les items comme livrés)
        completeMissionAction(mission.id).then(result => {
          if (result.success) {
            console.log('✅ Mission terminée:', mission.name);
          }
        });

        if (onMissionComplete) {
          onMissionComplete(mission.id);
        }
        return;
      }

      const currentPoint = routePoints[pointIdx];
      setPosition(currentPoint);

      // Vérifier si on est proche d'un stop
      const nearStop = isNearStop(currentPoint[0], currentPoint[1], stops);
      if (nearStop && !collectedStopIds.has(nearStop.site_id)) {
        collectedStopIds.add(nearStop.site_id);
        setCurrentStopIndex(stops.findIndex(s => s.site_id === nearStop.site_id));

        // Simuler le pickup ou dropoff selon le type d'arrêt
        if (nearStop.stop_type === 'pickup') {
          // RAMASSAGE : Collecter les items du site
          pickupItemsFromSiteAction(nearStop.site_id, mission.id).then(async result => {
            if (result.success && result.itemsPickedUp && result.itemsPickedUp > 0) {
              console.log(`📦 ${result.itemsPickedUp} items ramassés à ${result.siteName || nearStop.site?.name}`);
              // Recharger les données pour actualiser l'affichage
              if (onDataChange) {
                await onDataChange();
              }
            }
          });

          setCollectedSites(prev => {
            if (!prev.includes(nearStop.site_id)) {
              return [...prev, nearStop.site_id];
            }
            return prev;
          });
        } else if (nearStop.stop_type === 'dropoff') {
          // LIVRAISON : Déposer les items au site
          dropoffItemsAtSiteAction(nearStop.site_id, mission.id).then(async result => {
            if (result.success && result.itemsDelivered && result.itemsDelivered > 0) {
              console.log(`📍 ${result.itemsDelivered} items livrés à ${result.siteName || nearStop.site?.name}`);
              // Recharger les données pour actualiser l'affichage et l'occupation du site
              if (onDataChange) {
                await onDataChange();
              }
            }
          });
        } else if (nearStop.stop_type === 'waypoint') {
          // WAYPOINT : Juste un point de passage, collecter visuellement
          setCollectedSites(prev => {
            if (!prev.includes(nearStop.site_id)) {
              return [...prev, nearStop.site_id];
            }
            return prev;
          });
        }
      }

      animationRef.current.pointIdx = pointIdx + 1;

      // Continuer l'animation
      const timeout = setTimeout(animate, 50); // Vitesse d'animation
      animationRef.current.timeouts.push(timeout);
    };

    // Démarrer l'animation
    const startTimeout = setTimeout(animate, 500);
    animationRef.current.timeouts.push(startTimeout);

    return cleanup;
  }, [mission.id, mission.status, mission.stops, routePoints, onMissionComplete, cleanup, isNearStop]);

  if (!position) return null;

  return (
    <Marker
      position={position}
      icon={getVehicleIcon(vehicleType)}
    >
      <Popup>
        <div className="p-2">
          <h3 className="font-semibold text-base mb-1">
            {mission.vehicle?.name || 'Véhicule'}
          </h3>
          <p className="text-sm text-green-600 font-medium">
            🟢 En mission: {mission.name}
          </p>
          <p className="text-xs text-gray-500">
            Stop {currentStopIndex + 1} / {mission.stops?.length || 0}
          </p>
          {collectedSites.length > 0 && (
            <p className="text-xs text-blue-500 mt-1">
              📦 {collectedSites.length} collecté(s)
            </p>
          )}
        </div>
      </Popup>
    </Marker>
  );
}

export default function MapCanvas({
  center,
  zoom = 13,
  sites = [],
  vehicles = [],
  items = [],
  missions = [],
  activeMissionId,
  onDataChange
}: MapCanvasProps) {
  // État pour les sites dont les éléments ont été collectés
  const [collectedSiteIds, setCollectedSiteIds] = useState<string[]>([]);

  // État pour le modal de détails du site
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);

  // Trouver la mission active
  const activeMission = missions.find(m => m.id === activeMissionId) ||
    missions.find(m => m.status === 'in_progress');

  // Callback quand un élément est collecté
  const handleItemCollected = (siteId: string) => {
    setCollectedSiteIds(prev => [...prev, siteId]);
  };

  // Callback quand la mission est terminée
  const handleMissionComplete = async (missionId: string) => {
    await updateMissionStatusAction(missionId, 'completed');
    // Recharger les données au lieu de recharger toute la page
    if (onDataChange) {
      await onDataChange();
      console.log('✅ Données actualisées après la mission');
    }
  };

  // Réinitialiser quand la mission change
  useEffect(() => {
    if (!activeMission) {
      setCollectedSiteIds([]);
    }
  }, [activeMission?.id]);

  // Filtrer les items pour cacher ceux qui ont été collectés
  const visibleItems = items.filter(item => {
    if (!item.pickup_site_id) return true;
    return !collectedSiteIds.includes(item.pickup_site_id);
  });

  // Véhicules à afficher (cacher celui qui est en mission active)
  const visibleVehicles = vehicles.filter(v => {
    if (activeMission && activeMission.vehicle_id === v.id) {
      return false; // Le véhicule animé le remplace
    }
    return true;
  });

  return (
    <>
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ width: '100%', height: '100%' }}
      className="z-0"
    >
      {/* Tile Layer - Style Google Maps */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapController center={center} />

      {/* Afficher les routes des missions */}
      {missions.map((mission) => {
        if (!mission.stops || mission.stops.length === 0) return null;

        const isActive = mission.status === 'in_progress';

        return (
          <div key={mission.id}>
            {/* Route réelle suivant les rues */}
            <MissionRoute mission={mission} isActive={isActive} />

            {/* Point de départ du véhicule (pour mission active) */}
            {isActive && mission.vehicle?.current_latitude && mission.vehicle?.current_longitude && (
              <CircleMarker
                center={[mission.vehicle.current_latitude, mission.vehicle.current_longitude]}
                radius={8}
                fillColor="#3b82f6"
                fillOpacity={0.8}
                color="white"
                weight={2}
              >
                <Popup>
                  <div className="p-2">
                    <h3 className="font-semibold">🚀 Départ</h3>
                    <p className="text-sm text-gray-600">Position initiale du véhicule</p>
                  </div>
                </Popup>
              </CircleMarker>
            )}

            {/* Points de passage numérotés */}
            {mission.stops
              .filter(s => s.site?.latitude && s.site?.longitude)
              .sort((a, b) => a.sequence_order - b.sequence_order)
              .map((stop, index) => (
                <CircleMarker
                  key={stop.id}
                  center={[stop.site!.latitude, stop.site!.longitude]}
                  radius={12}
                  fillColor={
                    stop.status === 'completed' ? '#22c55e' :
                    stop.status === 'in_progress' ? '#f59e0b' :
                    '#6b7280'
                  }
                  fillOpacity={0.9}
                  color="white"
                  weight={2}
                >
                  <Popup>
                    <div className="p-2">
                      <h3 className="font-semibold">Stop #{index + 1}</h3>
                      <p className="text-sm">{stop.site?.name}</p>
                      <p className="text-xs text-gray-500">
                        Type: {stop.stop_type} | Status: {stop.status}
                      </p>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}

            {/* Véhicule animé pour mission active */}
            {isActive && mission.vehicle && (
              <AnimatedVehicle
                mission={mission}
                vehicleType={mission.vehicle.vehicle_type}
                onItemCollected={handleItemCollected}
                onMissionComplete={handleMissionComplete}
                onDataChange={onDataChange}
              />
            )}
          </div>
        );
      })}

      {/* Afficher tous les sites */}
      {sites.map((site) => (
        <Marker
          key={site.id}
          position={[site.latitude, site.longitude]}
          icon={getSiteIcon(site.site_type)}
          eventHandlers={{
            click: () => {
              setSelectedSiteId(site.id);
            },
          }}
        >
          <Popup>
            <div className="p-2">
              <h3 className="font-semibold text-base mb-1">{site.name}</h3>
              <p className="text-sm text-gray-600 mb-1">
                Type: <span className="font-medium">{site.site_type}</span>
              </p>
              {site.address && (
                <p className="text-xs text-gray-500 mb-2">{site.address}</p>
              )}
              <button
                onClick={() => setSelectedSiteId(site.id)}
                className="text-xs bg-primary text-white px-3 py-1 rounded hover:bg-primary/90 transition-colors"
              >
                Voir les détails
              </button>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Afficher tous les véhicules (sauf ceux en mission active) */}
      {visibleVehicles.map((vehicle) => {
        if (vehicle.current_latitude && vehicle.current_longitude) {
          return (
            <Marker
              key={vehicle.id}
              position={[vehicle.current_latitude, vehicle.current_longitude]}
              icon={getVehicleIcon(vehicle.vehicle_type)}
            >
              <Popup>
                <div className="p-2">
                  <h3 className="font-semibold text-base mb-1">{vehicle.name}</h3>
                  <p className="text-sm text-gray-600">
                    Type: <span className="font-medium">{vehicle.vehicle_type}</span>
                  </p>
                </div>
              </Popup>
            </Marker>
          );
        }
        return null;
      })}

      {/* Items affichés uniquement dans les détails des sites, pas sur la carte */}
    </MapContainer>

    {/* Modal de détails du site */}
    {selectedSiteId && (
      <SiteDetailsModal
        siteId={selectedSiteId}
        onClose={() => setSelectedSiteId(null)}
      />
    )}
    </>
  );
}
