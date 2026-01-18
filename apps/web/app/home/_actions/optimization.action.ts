'use server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { revalidatePath } from 'next/cache';

interface Location {
  id: string;
  latitude: number;
  longitude: number;
  name?: string;
}

interface OptimizedStop {
  site_id: string;
  sequence_order: number;
  distance_from_previous_km: number;
  cumulative_distance_km: number;
  estimated_arrival_time?: string;
  travel_time_minutes: number;
}

interface OptimizationResult {
  success: boolean;
  error?: string;
  data?: {
    optimized_stops: OptimizedStop[];
    total_distance_km: number;
    total_time_minutes: number;
    algorithm: string;
  };
}

// URL de l'API Python d'optimisation
const OPTIMIZATION_API_URL = process.env.OPTIMIZATION_API_URL || 'http://localhost:8000';

/**
 * Call the Python VRP/VRPTW optimization API
 */
async function callVRPOptimizationAPI(
  locations: Location[],
  startLocation: Location | null,
  startTime: string,
  averageSpeedKmh: number
): Promise<{
  success: boolean;
  optimized_stops?: Array<{
    id: string;
    sequence_order: number;
    arrival_time: string;
    cumulative_distance_km: number;
    cumulative_time_minutes: number;
  }>;
  total_distance_km?: number;
  total_time_minutes?: number;
  error?: string;
}> {
  try {
    const response = await fetch(`${OPTIMIZATION_API_URL}/api/optimize/route`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        locations: locations.map(loc => ({
          id: loc.id,
          latitude: loc.latitude,
          longitude: loc.longitude,
          name: loc.name,
        })),
        start_location: startLocation ? {
          id: startLocation.id,
          latitude: startLocation.latitude,
          longitude: startLocation.longitude,
          name: startLocation.name,
        } : null,
        start_time: startTime,
        average_speed_kmh: averageSpeedKmh,
        service_time_minutes: 2,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('VRP API call failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'API call failed',
    };
  }
}

/**
 * Calculate Haversine distance between two GPS coordinates (in km)
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Create distance matrix between all locations
 */
function createDistanceMatrix(locations: Location[]): number[][] {
  const n = locations.length;
  const matrix: number[][] = Array(n)
    .fill(null)
    .map(() => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i !== j) {
        matrix[i][j] = calculateDistance(
          locations[i].latitude,
          locations[i].longitude,
          locations[j].latitude,
          locations[j].longitude
        );
      }
    }
  }

  return matrix;
}

/**
 * Nearest Neighbor Algorithm for initial route
 */
function nearestNeighbor(
  distanceMatrix: number[][],
  startIndex: number = 0
): number[] {
  const n = distanceMatrix.length;
  const visited = new Set<number>();
  const route: number[] = [startIndex];
  visited.add(startIndex);

  let current = startIndex;

  while (visited.size < n) {
    let nearest = -1;
    let nearestDistance = Infinity;

    for (let i = 0; i < n; i++) {
      if (!visited.has(i) && distanceMatrix[current][i] < nearestDistance) {
        nearest = i;
        nearestDistance = distanceMatrix[current][i];
      }
    }

    if (nearest !== -1) {
      route.push(nearest);
      visited.add(nearest);
      current = nearest;
    }
  }

  return route;
}

/**
 * Calculate total route distance
 */
function calculateRouteDistance(
  route: number[],
  distanceMatrix: number[][]
): number {
  let total = 0;
  for (let i = 0; i < route.length - 1; i++) {
    total += distanceMatrix[route[i]][route[i + 1]];
  }
  return total;
}

/**
 * 2-opt optimization to improve the route
 */
function twoOpt(route: number[], distanceMatrix: number[][]): number[] {
  let improved = true;
  let bestRoute = [...route];
  let bestDistance = calculateRouteDistance(bestRoute, distanceMatrix);

  while (improved) {
    improved = false;

    for (let i = 1; i < bestRoute.length - 2; i++) {
      for (let j = i + 1; j < bestRoute.length - 1; j++) {
        // Create new route by reversing segment between i and j
        const newRoute = [
          ...bestRoute.slice(0, i),
          ...bestRoute.slice(i, j + 1).reverse(),
          ...bestRoute.slice(j + 1),
        ];

        const newDistance = calculateRouteDistance(newRoute, distanceMatrix);

        if (newDistance < bestDistance) {
          bestRoute = newRoute;
          bestDistance = newDistance;
          improved = true;
        }
      }
    }
  }

  return bestRoute;
}

/**
 * Optimize a mission's route
 * First tries VRP/VRPTW API, falls back to local algorithm
 */
export async function optimizeMissionAction(
  missionId: string,
  options?: {
    averageSpeedKmh?: number;
    serviceTimeMinutes?: number;
    startTime?: string;
  }
): Promise<OptimizationResult> {
  const supabase = getSupabaseServerClient();
  const averageSpeed = options?.averageSpeedKmh || 30;
  const serviceTime = options?.serviceTimeMinutes || 2;
  const startTime = options?.startTime || '08:00';

  try {
    // Get mission with stops
    const { data: mission, error: missionError } = await supabase
      .from('routes')
      .select(`
        *,
        vehicle:vehicles(id, name, current_latitude, current_longitude),
        stops:route_stops(
          id,
          site_id,
          sequence_order,
          stop_type,
          site:sites(id, name, latitude, longitude)
        )
      `)
      .eq('id', missionId)
      .single();

    if (missionError || !mission) {
      return { success: false, error: 'Mission non trouvée' };
    }

    if (!mission.stops || mission.stops.length < 2) {
      return { success: false, error: 'La mission doit avoir au moins 2 stops' };
    }

    // Build locations array - separate pickups from destination
    const pickupLocations: Location[] = [];
    let destinationLocation: Location | null = null;
    let startLocation: Location | null = null;

    // Add vehicle position as starting point if available
    if (mission.vehicle?.current_latitude && mission.vehicle?.current_longitude) {
      startLocation = {
        id: 'vehicle_start',
        latitude: mission.vehicle.current_latitude,
        longitude: mission.vehicle.current_longitude,
        name: 'Départ véhicule',
      };
    }

    // Separate pickup stops from destination (dropoff)
    for (const stop of mission.stops) {
      if (stop.site?.latitude && stop.site?.longitude) {
        const location: Location = {
          id: stop.site_id,
          latitude: stop.site.latitude,
          longitude: stop.site.longitude,
          name: stop.site.name,
        };

        if (stop.stop_type === 'dropoff') {
          // La destination est le dernier stop (dropoff)
          destinationLocation = location;
        } else {
          // Points de collecte à optimiser
          pickupLocations.push(location);
        }
      }
    }

    // Si pas de destination explicite, utiliser le dernier stop
    if (!destinationLocation && pickupLocations.length > 0) {
      destinationLocation = pickupLocations.pop()!;
    }

    if (pickupLocations.length === 0 && !destinationLocation) {
      return { success: false, error: 'Pas assez de coordonnées valides' };
    }

    // Locations à optimiser (sans la destination qui sera ajoutée à la fin)
    const locations = pickupLocations;

    // Try VRP/VRPTW API first
    let optimizedStops: OptimizedStop[] = [];
    let totalDistance = 0;
    let totalTime = 0;
    let algorithm = 'Nearest Neighbor + 2-opt';

    // Parse start time
    const [startHour, startMinute] = startTime.split(':').map(Number);
    let currentTime = new Date();
    currentTime.setHours(startHour, startMinute, 0, 0);

    // Only optimize if there are pickup locations
    if (locations.length > 0) {
      const vrpResult = await callVRPOptimizationAPI(
        locations,
        startLocation,
        startTime,
        averageSpeed
      );

      if (vrpResult.success && vrpResult.optimized_stops) {
        // Use VRP result
        algorithm = 'Google OR-Tools VRP/VRPTW';
        totalDistance = vrpResult.total_distance_km || 0;
        totalTime = vrpResult.total_time_minutes || 0;

        optimizedStops = vrpResult.optimized_stops.map(stop => ({
          site_id: stop.id,
          sequence_order: stop.sequence_order,
          distance_from_previous_km: 0,
          cumulative_distance_km: stop.cumulative_distance_km,
          estimated_arrival_time: stop.arrival_time,
          travel_time_minutes: stop.cumulative_time_minutes,
        }));
      } else {
        // Fallback to local algorithm
        console.log('VRP API not available, using local algorithm:', vrpResult.error);

        // Include start location in distance matrix if available
        const allLocations = startLocation ? [startLocation, ...locations] : locations;
        const distanceMatrix = createDistanceMatrix(allLocations);
        const initialRoute = nearestNeighbor(distanceMatrix, 0);
        const optimizedRoute = twoOpt(initialRoute, distanceMatrix);

        let cumulativeDistance = 0;
        let cumulativeTime = 0;

        for (let i = 0; i < optimizedRoute.length; i++) {
          const locationIndex = optimizedRoute[i];
          const location = allLocations[locationIndex];

          if (location.id === 'vehicle_start') continue;

          let distanceFromPrevious = 0;
          if (i > 0) {
            distanceFromPrevious = distanceMatrix[optimizedRoute[i - 1]][locationIndex];
          }

          cumulativeDistance += distanceFromPrevious;
          const travelTimeMinutes = (distanceFromPrevious / averageSpeed) * 60;
          cumulativeTime += travelTimeMinutes;

          if (i > 0) {
            cumulativeTime += serviceTime;
          }

          const eta = new Date(currentTime.getTime() + cumulativeTime * 60000);

          optimizedStops.push({
            site_id: location.id,
            sequence_order: optimizedStops.length + 1,
            distance_from_previous_km: Math.round(distanceFromPrevious * 100) / 100,
            cumulative_distance_km: Math.round(cumulativeDistance * 100) / 100,
            estimated_arrival_time: eta.toTimeString().slice(0, 5),
            travel_time_minutes: Math.round(cumulativeTime * 10) / 10,
          });
        }

        totalDistance = cumulativeDistance;
        totalTime = cumulativeTime;
      }
    }

    // Ajouter la destination finale après les pickups optimisés
    if (destinationLocation) {
      // Calculer la distance depuis le dernier pickup (ou le départ)
      let lastLocation: Location;
      if (optimizedStops.length > 0) {
        const lastStop = optimizedStops[optimizedStops.length - 1];
        const lastPickup = locations.find(l => l.id === lastStop.site_id);
        lastLocation = lastPickup || (startLocation || destinationLocation);
      } else {
        lastLocation = startLocation || destinationLocation;
      }

      const distanceToDestination = calculateDistance(
        lastLocation.latitude,
        lastLocation.longitude,
        destinationLocation.latitude,
        destinationLocation.longitude
      );

      totalDistance += distanceToDestination;
      const travelTimeMinutes = (distanceToDestination / averageSpeed) * 60;
      totalTime += travelTimeMinutes + serviceTime;

      const eta = new Date(currentTime.getTime() + totalTime * 60000);

      optimizedStops.push({
        site_id: destinationLocation.id,
        sequence_order: optimizedStops.length + 1,
        distance_from_previous_km: Math.round(distanceToDestination * 100) / 100,
        cumulative_distance_km: Math.round(totalDistance * 100) / 100,
        estimated_arrival_time: eta.toTimeString().slice(0, 5),
        travel_time_minutes: Math.round(totalTime * 10) / 10,
      });
    }

    totalDistance = Math.round(totalDistance * 100) / 100;
    totalTime = Math.round(totalTime);

    // Update stops in database with new sequence
    for (const optimizedStop of optimizedStops) {
      await supabase
        .from('route_stops')
        .update({
          sequence_order: optimizedStop.sequence_order,
          planned_arrival_time: optimizedStop.estimated_arrival_time,
        })
        .eq('route_id', missionId)
        .eq('site_id', optimizedStop.site_id);
    }

    // Update mission with optimization data
    await supabase
      .from('routes')
      .update({
        is_optimized: true,
        total_distance_km: totalDistance,
        estimated_duration_minutes: totalTime,
        stops_sequence: optimizedStops.map(s => ({
          site_id: s.site_id,
          order: s.sequence_order,
          eta: s.estimated_arrival_time,
        })),
      })
      .eq('id', missionId);

    revalidatePath('/home');

    return {
      success: true,
      data: {
        optimized_stops: optimizedStops,
        total_distance_km: totalDistance,
        total_time_minutes: totalTime,
        algorithm,
      },
    };
  } catch (error) {
    console.error('Error optimizing mission:', error);
    return { success: false, error: 'Erreur lors de l\'optimisation' };
  }
}

/**
 * Get optimization statistics for a mission
 */
export async function getMissionOptimizationStats(missionId: string) {
  const supabase = getSupabaseServerClient();

  const { data: mission, error } = await supabase
    .from('routes')
    .select(`
      is_optimized,
      total_distance_km,
      estimated_duration_minutes,
      stops_sequence
    `)
    .eq('id', missionId)
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: mission };
}
