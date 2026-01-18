'use server';

/**
 * Algorithme d'optimisation amélioré pour le routage de véhicules
 * Prend en compte les contraintes de pickup avant dropoff et optimise vraiment le trajet
 */

import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { revalidatePath } from 'next/cache';

interface Stop {
  id: string;
  site_id: string;
  site_name: string;
  latitude: number;
  longitude: number;
  stop_type: 'pickup' | 'dropoff' | 'waypoint' | 'depot';
  item_ids: string[];
  time_window_start?: string;
  time_window_end?: string;
}

interface OptimizedStop {
  site_id: string;
  sequence_order: number;
  stop_type: string;
  distance_from_previous_km: number;
  cumulative_distance_km: number;
  estimated_arrival_time: string;
  travel_time_minutes: number;
  item_ids: string[];
}

/**
 * Calculer la distance haversine entre deux points GPS (en km)
 */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Créer la matrice de distances entre tous les arrêts
 */
function createDistanceMatrix(stops: Stop[]): number[][] {
  const n = stops.length;
  const matrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i !== j) {
        matrix[i][j] = haversineDistance(
          stops[i].latitude,
          stops[i].longitude,
          stops[j].latitude,
          stops[j].longitude
        );
      }
    }
  }

  return matrix;
}

/**
 * Vérifier si une route respecte les contraintes pickup-avant-dropoff
 * Pour chaque item, son pickup doit être visité avant son dropoff
 */
function isValidRoute(route: number[], stops: Stop[]): boolean {
  const pickedItems = new Set<string>();

  for (const idx of route) {
    const stop = stops[idx];

    if (stop.stop_type === 'pickup') {
      // Ajouter les items ramassés
      stop.item_ids?.forEach(itemId => pickedItems.add(itemId));
    } else if (stop.stop_type === 'dropoff') {
      // Vérifier que tous les items à livrer ont été ramassés
      for (const itemId of stop.item_ids || []) {
        if (!pickedItems.has(itemId)) {
          return false; // Item livré avant d'être ramassé !
        }
      }
    }
  }

  return true;
}

/**
 * Algorithme Nearest Neighbor amélioré avec contraintes
 * Construit une route en choisissant toujours l'arrêt le plus proche qui respecte les contraintes
 */
function nearestNeighborWithConstraints(
  stops: Stop[],
  distanceMatrix: number[][],
  startIdx: number
): number[] {
  const n = stops.length;
  const visited = new Set<number>();
  const route: number[] = [startIdx];
  visited.add(startIdx);

  const pickedItems = new Set<string>();

  // Ajouter les items du point de départ s'il s'agit d'un pickup
  if (stops[startIdx].stop_type === 'pickup') {
    stops[startIdx].item_ids?.forEach(id => pickedItems.add(id));
  }

  while (visited.size < n) {
    let bestNext = -1;
    let bestDistance = Infinity;

    const current = route[route.length - 1];

    // Chercher le prochain arrêt le plus proche qui respecte les contraintes
    for (let i = 0; i < n; i++) {
      if (visited.has(i)) continue;

      const stop = stops[i];
      const distance = distanceMatrix[current][i];

      // Vérifier les contraintes pour les dropoffs
      if (stop.stop_type === 'dropoff') {
        // Vérifier que tous les items à livrer ont été ramassés
        const canDeliver = (stop.item_ids || []).every(id => pickedItems.has(id));
        if (!canDeliver) continue; // Skip ce dropoff pour l'instant
      }

      if (distance < bestDistance) {
        bestDistance = distance;
        bestNext = i;
      }
    }

    if (bestNext === -1) break; // Aucun arrêt valide trouvé

    route.push(bestNext);
    visited.add(bestNext);

    // Mettre à jour les items ramassés
    const nextStop = stops[bestNext];
    if (nextStop.stop_type === 'pickup') {
      nextStop.item_ids?.forEach(id => pickedItems.add(id));
    }
  }

  return route;
}

/**
 * Calculer la distance totale d'une route
 */
function calculateTotalDistance(route: number[], distanceMatrix: number[][]): number {
  let total = 0;
  for (let i = 0; i < route.length - 1; i++) {
    total += distanceMatrix[route[i]][route[i + 1]];
  }
  return total;
}

/**
 * Algorithme 2-opt amélioré avec respect des contraintes
 * Améliore une route en inversant des segments tant que ça réduit la distance
 */
function twoOptWithConstraints(
  route: number[],
  stops: Stop[],
  distanceMatrix: number[][]
): number[] {
  let improved = true;
  let bestRoute = [...route];
  let bestDistance = calculateTotalDistance(bestRoute, distanceMatrix);
  let iterations = 0;
  const maxIterations = 1000; // Limite pour éviter les boucles infinies

  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;

    for (let i = 1; i < bestRoute.length - 2; i++) {
      for (let j = i + 1; j < bestRoute.length - 1; j++) {
        // Créer une nouvelle route en inversant le segment [i, j]
        const newRoute = [
          ...bestRoute.slice(0, i),
          ...bestRoute.slice(i, j + 1).reverse(),
          ...bestRoute.slice(j + 1),
        ];

        // Vérifier que la nouvelle route respecte les contraintes
        if (!isValidRoute(newRoute, stops)) continue;

        const newDistance = calculateTotalDistance(newRoute, distanceMatrix);

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
 * Optimiser une mission avec l'algorithme amélioré
 */
export async function optimizeMissionImprovedAction(
  missionId: string,
  options?: {
    averageSpeedKmh?: number;
    serviceTimeMinutes?: number;
    startTime?: string;
  }
) {
  const supabase = getSupabaseServerClient();
  const averageSpeed = options?.averageSpeedKmh || 30;
  const serviceTime = options?.serviceTimeMinutes || 5;
  const startTime = options?.startTime || '08:00';

  try {
    // Récupérer la mission avec tous ses arrêts
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
          item_ids,
          time_window_start,
          time_window_end,
          site:sites(id, name, latitude, longitude)
        )
      `)
      .eq('id', missionId)
      .single();

    if (missionError || !mission) {
      return { success: false, error: 'Mission non trouvée' };
    }

    if (!mission.stops || mission.stops.length < 2) {
      return { success: false, error: 'La mission doit avoir au moins 2 arrêts' };
    }

    // Construire la liste des arrêts
    const stops: Stop[] = mission.stops
      .filter((s: any) => s.site?.latitude && s.site?.longitude)
      .map((s: any) => ({
        id: s.id,
        site_id: s.site_id,
        site_name: s.site.name,
        latitude: s.site.latitude,
        longitude: s.site.longitude,
        stop_type: s.stop_type,
        item_ids: s.item_ids || [],
        time_window_start: s.time_window_start,
        time_window_end: s.time_window_end,
      }));

    if (stops.length < 2) {
      return { success: false, error: 'Pas assez d\'arrêts valides' };
    }

    // Créer la matrice de distances
    const distanceMatrix = createDistanceMatrix(stops);

    // Trouver le meilleur point de départ (premier pickup ou dépôt)
    let startIdx = 0;
    const depotIdx = stops.findIndex(s => s.stop_type === 'depot');
    if (depotIdx >= 0) {
      startIdx = depotIdx;
    } else {
      const firstPickupIdx = stops.findIndex(s => s.stop_type === 'pickup');
      if (firstPickupIdx >= 0) {
        startIdx = firstPickupIdx;
      }
    }

    // Algorithme Nearest Neighbor avec contraintes
    console.log('🔍 Optimisation avec Nearest Neighbor + 2-opt...');
    let initialRoute = nearestNeighborWithConstraints(stops, distanceMatrix, startIdx);

    // Vérifier la validité de la route initiale
    if (!isValidRoute(initialRoute, stops)) {
      console.error('❌ Route initiale invalide !');
      return { success: false, error: 'Impossible de créer une route valide' };
    }

    // Amélioration avec 2-opt
    const optimizedRoute = twoOptWithConstraints(initialRoute, stops, distanceMatrix);

    // Calculer les statistiques de la route optimisée
    const [startHour, startMinute] = startTime.split(':').map(Number);
    let currentTime = new Date();
    currentTime.setHours(startHour, startMinute, 0, 0);

    let cumulativeDistance = 0;
    let cumulativeTime = 0;

    const optimizedStops: OptimizedStop[] = [];

    for (let i = 0; i < optimizedRoute.length; i++) {
      const stopIdx = optimizedRoute[i];
      const stop = stops[stopIdx];

      let distanceFromPrevious = 0;
      if (i > 0) {
        const prevIdx = optimizedRoute[i - 1];
        distanceFromPrevious = distanceMatrix[prevIdx][stopIdx];
      }

      cumulativeDistance += distanceFromPrevious;
      const travelTime = (distanceFromPrevious / averageSpeed) * 60;
      cumulativeTime += travelTime;

      if (i > 0) {
        cumulativeTime += serviceTime;
      }

      const eta = new Date(currentTime.getTime() + cumulativeTime * 60000);

      optimizedStops.push({
        site_id: stop.site_id,
        sequence_order: i + 1,
        stop_type: stop.stop_type,
        distance_from_previous_km: Math.round(distanceFromPrevious * 100) / 100,
        cumulative_distance_km: Math.round(cumulativeDistance * 100) / 100,
        estimated_arrival_time: eta.toTimeString().slice(0, 5),
        travel_time_minutes: Math.round(cumulativeTime * 10) / 10,
        item_ids: stop.item_ids,
      });
    }

    const totalDistance = Math.round(cumulativeDistance * 100) / 100;
    const totalTime = Math.round(cumulativeTime);

    console.log(`✅ Route optimisée: ${totalDistance} km, ${totalTime} min`);

    // Mettre à jour les arrêts dans la base de données
    for (const optimizedStop of optimizedStops) {
      await supabase
        .from('route_stops')
        .update({
          sequence_order: optimizedStop.sequence_order,
          planned_arrival_time: optimizedStop.estimated_arrival_time,
          distance_from_previous_km: optimizedStop.distance_from_previous_km,
        })
        .eq('route_id', missionId)
        .eq('site_id', optimizedStop.site_id);
    }

    // Mettre à jour la mission
    await supabase
      .from('routes')
      .update({
        is_optimized: true,
        total_distance_km: totalDistance,
        estimated_duration_minutes: totalTime,
        stops_sequence: optimizedStops.map(s => ({
          site_id: s.site_id,
          order: s.sequence_order,
          type: s.stop_type,
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
        algorithm: 'Nearest Neighbor + 2-opt (avec contraintes)',
      },
    };
  } catch (error) {
    console.error('Erreur optimisation:', error);
    return { success: false, error: 'Erreur lors de l\'optimisation' };
  }
}
