'use server';

/**
 * Server Actions pour créer des entités sur le Map Builder
 */

import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { revalidatePath } from 'next/cache';

interface CreateVehicleParams {
  organization_id: string;
  name: string;
  vehicle_type: string;
  identifier?: string;
  capacity?: number;
  icon?: string;
  color?: string;
  latitude?: number;
  longitude?: number;
  // Nouveaux champs pour capacités et consommation
  capacity_weight_kg?: number;
  capacity_volume_m3?: number;
  fuel_type?: string;
  fuel_consumption?: number;
  consumption_unit?: string;
  tank_capacity?: number;
  range_km?: number;
}

interface CreateSiteParams {
  organization_id: string;
  name: string;
  site_type: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  // Nouveaux champs pour capacités
  capacity_weight_kg?: number;
  capacity_volume_m3?: number;
  capacity_items_count?: number;
}

interface CreateItemParams {
  organization_id: string;
  name: string;
  item_type: string;
  priority?: string;
  description?: string;
  site_id?: string;
}

export async function createVehicleAction(params: CreateVehicleParams) {
  try {
    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase
      .from('vehicles')
      .insert({
        organization_id: params.organization_id,
        name: params.name,
        vehicle_type: params.vehicle_type,
        identifier: params.identifier,
        capacity: params.capacity,
        icon: params.icon || 'truck',
        color: params.color || '#3b82f6',
        current_latitude: params.latitude,
        current_longitude: params.longitude,
        status: 'active',
        // Nouveaux champs
        capacity_weight_kg: params.capacity_weight_kg,
        capacity_volume_m3: params.capacity_volume_m3,
        fuel_type: params.fuel_type,
        fuel_consumption: params.fuel_consumption,
        consumption_unit: params.consumption_unit,
        tank_capacity: params.tank_capacity,
        range_km: params.range_km,
      })
      .select()
      .single();

    if (error) {
      console.error('Erreur création véhicule:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/home');
    return { success: true, data };
  } catch (error) {
    console.error('Exception création véhicule:', error);
    return { success: false, error: 'Erreur inattendue' };
  }
}

export async function createSiteAction(params: CreateSiteParams) {
  try {
    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase
      .from('sites')
      .insert({
        organization_id: params.organization_id,
        name: params.name,
        site_type: params.site_type,
        address: params.address,
        // Coordonnées par défaut (Paris) si non fournies - L'utilisateur pourra les modifier via la carte
        latitude: params.latitude || 48.8566,
        longitude: params.longitude || 2.3522,
        // Nouveaux champs de capacité
        capacity_weight_kg: params.capacity_weight_kg,
        capacity_volume_m3: params.capacity_volume_m3,
        capacity_items_count: params.capacity_items_count,
      })
      .select()
      .single();

    if (error) {
      console.error('Erreur création site:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/home');
    return { success: true, data };
  } catch (error) {
    console.error('Exception création site:', error);
    return { success: false, error: 'Erreur inattendue' };
  }
}

export async function createItemAction(params: CreateItemParams) {
  try {
    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase
      .from('items')
      .insert({
        organization_id: params.organization_id,
        name: params.name,
        item_type: params.item_type,
        priority: params.priority || 'standard',
        description: params.description,
        pickup_site_id: params.site_id,
      })
      .select()
      .single();

    if (error) {
      console.error('Erreur création item:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/home');
    return { success: true, data };
  } catch (error) {
    console.error('Exception création item:', error);
    return { success: false, error: 'Erreur inattendue' };
  }
}
