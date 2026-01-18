'use server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { revalidatePath } from 'next/cache';
import {
  OrganizationConfig,
  DEFAULT_ORGANIZATION_CONFIG,
  ElementTypeConfig,
} from '~/config/element-types.config';

/**
 * Récupérer la configuration de l'organisation
 */
export async function getOrganizationConfigAction(organizationId: string) {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from('organization_configs')
    .select('*')
    .eq('organization_id', organizationId)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows returned
    console.error('Error fetching organization config:', error);
    return { success: false, error: error.message };
  }

  // Si pas de config, créer une config par défaut
  if (!data) {
    const result = await createDefaultConfigAction(organizationId);
    return result;
  }

  // Transformer les données de la DB au format OrganizationConfig
  const config: OrganizationConfig = {
    id: data.id,
    organization_id: data.organization_id,
    labels: data.labels,
    vehicleTypes: data.vehicle_types || [],
    siteTypes: data.site_types || [],
    itemTypes: data.item_types || [],
    settings: data.settings,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };

  return { success: true, data: config };
}

/**
 * Créer une configuration par défaut pour une nouvelle organisation
 */
export async function createDefaultConfigAction(organizationId: string) {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from('organization_configs')
    .insert({
      organization_id: organizationId,
      labels: DEFAULT_ORGANIZATION_CONFIG.labels,
      vehicle_types: DEFAULT_ORGANIZATION_CONFIG.vehicleTypes,
      site_types: DEFAULT_ORGANIZATION_CONFIG.siteTypes,
      item_types: DEFAULT_ORGANIZATION_CONFIG.itemTypes,
      settings: DEFAULT_ORGANIZATION_CONFIG.settings,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating default config:', error);
    return { success: false, error: error.message };
  }

  const config: OrganizationConfig = {
    id: data.id,
    organization_id: data.organization_id,
    labels: data.labels,
    vehicleTypes: data.vehicle_types || [],
    siteTypes: data.site_types || [],
    itemTypes: data.item_types || [],
    settings: data.settings,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };

  return { success: true, data: config };
}

/**
 * Mettre à jour les labels de l'organisation
 */
export async function updateLabelsAction(
  organizationId: string,
  labels: OrganizationConfig['labels']
) {
  const supabase = getSupabaseServerClient();

  const { error } = await supabase
    .from('organization_configs')
    .update({ labels })
    .eq('organization_id', organizationId);

  if (error) {
    console.error('Error updating labels:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/home');
  return { success: true };
}

/**
 * Mettre à jour les paramètres de l'organisation
 */
export async function updateSettingsAction(
  organizationId: string,
  settings: OrganizationConfig['settings']
) {
  const supabase = getSupabaseServerClient();

  const { error } = await supabase
    .from('organization_configs')
    .update({ settings })
    .eq('organization_id', organizationId);

  if (error) {
    console.error('Error updating settings:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/home');
  return { success: true };
}

/**
 * Ajouter un nouveau type de véhicule
 */
export async function addVehicleTypeAction(
  organizationId: string,
  vehicleType: ElementTypeConfig
) {
  const supabase = getSupabaseServerClient();

  // Récupérer les types existants
  const { data: config } = await supabase
    .from('organization_configs')
    .select('vehicle_types')
    .eq('organization_id', organizationId)
    .single();

  const existingTypes = config?.vehicle_types || [];
  const updatedTypes = [...existingTypes, vehicleType];

  const { error } = await supabase
    .from('organization_configs')
    .update({ vehicle_types: updatedTypes })
    .eq('organization_id', organizationId);

  if (error) {
    console.error('Error adding vehicle type:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/home');
  return { success: true };
}

/**
 * Ajouter un nouveau type de site
 */
export async function addSiteTypeAction(
  organizationId: string,
  siteType: ElementTypeConfig
) {
  const supabase = getSupabaseServerClient();

  const { data: config } = await supabase
    .from('organization_configs')
    .select('site_types')
    .eq('organization_id', organizationId)
    .single();

  const existingTypes = config?.site_types || [];
  const updatedTypes = [...existingTypes, siteType];

  const { error } = await supabase
    .from('organization_configs')
    .update({ site_types: updatedTypes })
    .eq('organization_id', organizationId);

  if (error) {
    console.error('Error adding site type:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/home');
  return { success: true };
}

/**
 * Ajouter un nouveau type d'item
 */
export async function addItemTypeAction(
  organizationId: string,
  itemType: ElementTypeConfig
) {
  const supabase = getSupabaseServerClient();

  const { data: config } = await supabase
    .from('organization_configs')
    .select('item_types')
    .eq('organization_id', organizationId)
    .single();

  const existingTypes = config?.item_types || [];
  const updatedTypes = [...existingTypes, itemType];

  const { error } = await supabase
    .from('organization_configs')
    .update({ item_types: updatedTypes })
    .eq('organization_id', organizationId);

  if (error) {
    console.error('Error adding item type:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/home');
  return { success: true };
}

/**
 * Supprimer un type d'élément
 */
export async function deleteElementTypeAction(
  organizationId: string,
  category: 'vehicle' | 'site' | 'item',
  typeId: string
) {
  const supabase = getSupabaseServerClient();

  const columnMap = {
    vehicle: 'vehicle_types',
    site: 'site_types',
    item: 'item_types',
  };

  const column = columnMap[category];

  const { data: config } = await supabase
    .from('organization_configs')
    .select(column)
    .eq('organization_id', organizationId)
    .single();

  if (!config) {
    return { success: false, error: 'Configuration not found' };
  }

  const existingTypes = (config as any)[column] || [];
  const updatedTypes = existingTypes.filter((t: ElementTypeConfig) => t.id !== typeId);

  const { error } = await supabase
    .from('organization_configs')
    .update({ [column]: updatedTypes })
    .eq('organization_id', organizationId);

  if (error) {
    console.error('Error deleting element type:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/home');
  return { success: true };
}

/**
 * Mettre à jour un type d'élément existant
 */
export async function updateElementTypeAction(
  organizationId: string,
  category: 'vehicle' | 'site' | 'item',
  updatedType: ElementTypeConfig
) {
  const supabase = getSupabaseServerClient();

  const columnMap = {
    vehicle: 'vehicle_types',
    site: 'site_types',
    item: 'item_types',
  };

  const column = columnMap[category];

  const { data: config } = await supabase
    .from('organization_configs')
    .select(column)
    .eq('organization_id', organizationId)
    .single();

  if (!config) {
    return { success: false, error: 'Configuration not found' };
  }

  const existingTypes = (config as any)[column] || [];
  const updatedTypes = existingTypes.map((t: ElementTypeConfig) =>
    t.id === updatedType.id ? updatedType : t
  );

  const { error } = await supabase
    .from('organization_configs')
    .update({ [column]: updatedTypes })
    .eq('organization_id', organizationId);

  if (error) {
    console.error('Error updating element type:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/home');
  return { success: true };
}

/**
 * Sauvegarder toute la configuration
 */
export async function saveFullConfigAction(
  organizationId: string,
  config: Partial<OrganizationConfig>
) {
  const supabase = getSupabaseServerClient();

  const updateData: any = {};

  if (config.labels) updateData.labels = config.labels;
  if (config.vehicleTypes) updateData.vehicle_types = config.vehicleTypes;
  if (config.siteTypes) updateData.site_types = config.siteTypes;
  if (config.itemTypes) updateData.item_types = config.itemTypes;
  if (config.settings) updateData.settings = config.settings;

  const { error } = await supabase
    .from('organization_configs')
    .update(updateData)
    .eq('organization_id', organizationId);

  if (error) {
    console.error('Error saving full config:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/home');
  return { success: true };
}
