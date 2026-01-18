'use server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { revalidatePath } from 'next/cache';

export interface MissionStop {
  site_id: string;
  order: number;
  type: 'pickup' | 'dropoff' | 'waypoint' | 'depot';
  item_ids?: string[];
  planned_arrival_time?: string;
  time_window_start?: string;
  time_window_end?: string;
}

export interface CreateMissionData {
  organization_id: string;
  name: string;
  description?: string;
  vehicle_id: string;
  route_type: 'delivery' | 'pickup' | 'round_trip' | 'custom';
  planned_date: string;
  planned_start_time?: string;
  stops: MissionStop[];
  assigned_items_ids?: string[];
}

/**
 * Créer une nouvelle mission
 */
export async function createMissionAction(data: CreateMissionData) {
  const supabase = getSupabaseServerClient();

  try {
    // Créer la mission (route)
    const { data: mission, error: missionError } = await supabase
      .from('routes')
      .insert({
        organization_id: data.organization_id,
        name: data.name,
        description: data.description,
        vehicle_id: data.vehicle_id,
        route_type: data.route_type,
        planned_date: data.planned_date,
        planned_start_time: data.planned_start_time,
        stops_sequence: data.stops,
        assigned_items_ids: data.assigned_items_ids || [],
        status: 'planned',
        is_optimized: false,
      })
      .select()
      .single();

    if (missionError) {
      console.error('Error creating mission:', missionError);
      return { success: false, error: missionError.message };
    }

    // Créer les stops individuels
    if (data.stops.length > 0) {
      const stopsToInsert = data.stops.map((stop) => ({
        route_id: mission.id,
        site_id: stop.site_id,
        sequence_order: stop.order,
        stop_type: stop.type,
        item_ids: stop.item_ids || [],
        planned_arrival_time: stop.planned_arrival_time,
        time_window_start: stop.time_window_start,
        time_window_end: stop.time_window_end,
        status: 'pending',
      }));

      const { error: stopsError } = await supabase
        .from('route_stops')
        .insert(stopsToInsert);

      if (stopsError) {
        console.error('Error creating stops:', stopsError);
        // Supprimer la mission si les stops échouent
        await supabase.from('routes').delete().eq('id', mission.id);
        return { success: false, error: stopsError.message };
      }

      // Mettre à jour le dropoff_site_id des items assignés
      // Trouver le(s) stop(s) de type 'dropoff'
      const dropoffStops = data.stops.filter(stop => stop.type === 'dropoff');

      console.log('🔍 DEBUG Mission - Stops:', JSON.stringify(data.stops, null, 2));
      console.log('🔍 DEBUG Mission - Dropoff stops trouvés:', dropoffStops.length);
      console.log('🔍 DEBUG Mission - Items assignés:', data.assigned_items_ids);

      if (dropoffStops.length > 0 && data.assigned_items_ids && data.assigned_items_ids.length > 0) {
        // Pour simplifier, on utilise le premier site de dropoff comme destination
        // (dans un cas plus complexe, chaque item pourrait avoir sa propre destination)
        const destinationSiteId = dropoffStops[0].site_id;

        console.log(`🎯 Mise à jour dropoff_site_id → ${destinationSiteId} pour ${data.assigned_items_ids.length} items`);

        const { data: updatedItems, error: updateError } = await supabase
          .from('items')
          .update({ dropoff_site_id: destinationSiteId })
          .in('id', data.assigned_items_ids)
          .select('id, name, pickup_site_id, dropoff_site_id');

        if (updateError) {
          console.error('❌ Error updating items dropoff_site_id:', updateError);
        } else {
          console.log(`✅ ${data.assigned_items_ids.length} items: dropoff_site_id mis à jour`);
          console.log('📋 Items après mise à jour:', JSON.stringify(updatedItems, null, 2));
        }
      } else {
        console.warn('⚠️ Pas de dropoff stop ou pas d\'items assignés - dropoff_site_id NON défini');
      }
    }

    revalidatePath('/home');
    return { success: true, data: mission };
  } catch (error) {
    console.error('Error in createMissionAction:', error);
    return { success: false, error: 'Erreur lors de la création de la mission' };
  }
}

/**
 * Récupérer les missions d'une organisation
 */
export async function getMissionsAction(organizationId: string) {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from('routes')
    .select(`
      *,
      vehicle:vehicles(id, name, vehicle_type, current_latitude, current_longitude),
      stops:route_stops(
        *,
        site:sites(id, name, site_type, latitude, longitude, address)
      )
    `)
    .eq('organization_id', organizationId)
    .order('planned_date', { ascending: false })
    .order('planned_start_time', { ascending: true });

  if (error) {
    console.error('Error fetching missions:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * Récupérer une mission spécifique avec tous ses détails
 */
export async function getMissionDetailsAction(missionId: string) {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from('routes')
    .select(`
      *,
      vehicle:vehicles(*),
      stops:route_stops(
        *,
        site:sites(*)
      )
    `)
    .eq('id', missionId)
    .single();

  if (error) {
    console.error('Error fetching mission details:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * Mettre à jour le statut d'une mission
 */
export async function updateMissionStatusAction(
  missionId: string,
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled' | 'paused'
) {
  const supabase = getSupabaseServerClient();

  const updateData: any = { status };

  if (status === 'in_progress') {
    updateData.actual_start_time = new Date().toISOString();
  } else if (status === 'completed') {
    updateData.actual_end_time = new Date().toISOString();
  }

  const { error } = await supabase
    .from('routes')
    .update(updateData)
    .eq('id', missionId);

  if (error) {
    console.error('Error updating mission status:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/home');
  return { success: true };
}

/**
 * Mettre à jour le statut d'un stop
 */
export async function updateStopStatusAction(
  stopId: string,
  status: 'pending' | 'arrived' | 'in_progress' | 'completed' | 'skipped'
) {
  const supabase = getSupabaseServerClient();

  const updateData: any = { status };

  if (status === 'arrived') {
    updateData.actual_arrival_time = new Date().toISOString();
  } else if (status === 'completed') {
    updateData.actual_departure_time = new Date().toISOString();
  }

  const { error } = await supabase
    .from('route_stops')
    .update(updateData)
    .eq('id', stopId);

  if (error) {
    console.error('Error updating stop status:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/home');
  return { success: true };
}

/**
 * Supprimer une mission
 */
export async function deleteMissionAction(missionId: string) {
  const supabase = getSupabaseServerClient();

  // Les stops seront supprimés automatiquement grâce à ON DELETE CASCADE
  const { error } = await supabase
    .from('routes')
    .delete()
    .eq('id', missionId);

  if (error) {
    console.error('Error deleting mission:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/home');
  return { success: true };
}

/**
 * Mettre à jour la position d'un véhicule (pour le tracking temps réel)
 */
export async function updateVehiclePositionAction(
  vehicleId: string,
  latitude: number,
  longitude: number
) {
  const supabase = getSupabaseServerClient();

  const { error } = await supabase
    .from('vehicles')
    .update({
      current_latitude: latitude,
      current_longitude: longitude,
      last_position_update: new Date().toISOString(),
    })
    .eq('id', vehicleId);

  if (error) {
    console.error('Error updating vehicle position:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
