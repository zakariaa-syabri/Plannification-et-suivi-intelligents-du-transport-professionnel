'use server';

/**
 * Server Action pour récupérer les détails d'un site avec ses items et sa capacité
 */

import { getSupabaseServerClient } from '@kit/supabase/server-client';

export interface SiteItem {
  id: string;
  name: string;
  identifier: string | null;
  item_type: string;
  weight_kg: number | null;
  volume_m3: number | null;
  status: string;
  icon: string;
  color: string;
  priority: string;
}

export interface SiteOccupancy {
  site_id: string;
  site_name: string;
  capacity_weight_kg: number | null;
  capacity_volume_m3: number | null;
  capacity_items_count: number | null;
  current_items_count: number;
  current_weight_kg: number;
  current_volume_m3: number;
  items_occupancy_percent: number | null;
  weight_occupancy_percent: number | null;
  volume_occupancy_percent: number | null;
  is_full: boolean;
}

export interface SiteDetails {
  id: string;
  name: string;
  description: string | null;
  site_type: string;
  address: string | null;
  city: string | null;
  icon: string;
  color: string;
  status: string;
  latitude: number;
  longitude: number;
  capacity_weight_kg: number | null;
  capacity_volume_m3: number | null;
  capacity_items_count: number | null;
  occupancy: SiteOccupancy | null;
  items: SiteItem[];
}

export async function getSiteDetailsAction(siteId: string) {
  try {
    const supabase = getSupabaseServerClient();

    // Récupérer les informations du site
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('*')
      .eq('id', siteId)
      .single();

    if (siteError || !site) {
      console.error('Erreur récupération site:', siteError);
      return { success: false, error: siteError?.message || 'Site non trouvé' };
    }

    // Récupérer les items du site selon leur localisation actuelle
    // - Items en attente/assignés : au site de pickup
    // - Items livrés : au site de dropoff
    // - Items en transit : dans le véhicule (pas affichés)
    console.log(`🔍 Site Details - Récupération items pour site: ${siteId} (${site.name})`);

    const { data: itemsAtPickup } = await supabase
      .from('items')
      .select('id, name, identifier, item_type, weight_kg, volume_m3, status, icon, color, priority, pickup_site_id, dropoff_site_id')
      .eq('pickup_site_id', siteId)
      .in('status', ['pending', 'assigned']);

    console.log(`📦 Items au pickup (pending/assigned): ${itemsAtPickup?.length || 0}`);
    if (itemsAtPickup && itemsAtPickup.length > 0) {
      console.log('   Items:', itemsAtPickup.map(i => `${i.name} (pickup: ${i.pickup_site_id}, dropoff: ${i.dropoff_site_id}, status: ${i.status})`));
    }

    const { data: itemsDelivered } = await supabase
      .from('items')
      .select('id, name, identifier, item_type, weight_kg, volume_m3, status, icon, color, priority, pickup_site_id, dropoff_site_id')
      .eq('dropoff_site_id', siteId)
      .eq('status', 'delivered');

    console.log(`✅ Items livrés à ce site: ${itemsDelivered?.length || 0}`);
    if (itemsDelivered && itemsDelivered.length > 0) {
      console.log('   Items:', itemsDelivered.map(i => `${i.name} (pickup: ${i.pickup_site_id}, dropoff: ${i.dropoff_site_id}, status: ${i.status})`));
    }

    // Combiner les deux listes
    const items = [...(itemsAtPickup || []), ...(itemsDelivered || [])];
    const itemsError = null;

    console.log(`📊 Total items à afficher: ${items.length}`);

    if (itemsError) {
      console.error('Erreur récupération items:', itemsError);
    }

    // Calculer l'occupation manuellement (alternative à la vue)
    const siteItems = items || [];
    const currentItemsCount = siteItems.length;
    const currentWeightKg = siteItems.reduce((sum, item) => sum + (item.weight_kg || 0), 0);
    const currentVolumeM3 = siteItems.reduce((sum, item) => sum + (item.volume_m3 || 0), 0);

    const itemsOccupancyPercent = site.capacity_items_count && site.capacity_items_count > 0
      ? Math.round((currentItemsCount / site.capacity_items_count) * 100 * 100) / 100
      : null;

    const weightOccupancyPercent = site.capacity_weight_kg && site.capacity_weight_kg > 0
      ? Math.round((currentWeightKg / site.capacity_weight_kg) * 100 * 100) / 100
      : null;

    const volumeOccupancyPercent = site.capacity_volume_m3 && site.capacity_volume_m3 > 0
      ? Math.round((currentVolumeM3 / site.capacity_volume_m3) * 100 * 100) / 100
      : null;

    const isFull = (site.capacity_items_count && currentItemsCount >= site.capacity_items_count) ||
                   (site.capacity_weight_kg && currentWeightKg >= site.capacity_weight_kg) ||
                   (site.capacity_volume_m3 && currentVolumeM3 >= site.capacity_volume_m3);

    const occupancy: SiteOccupancy = {
      site_id: site.id,
      site_name: site.name,
      capacity_weight_kg: site.capacity_weight_kg,
      capacity_volume_m3: site.capacity_volume_m3,
      capacity_items_count: site.capacity_items_count,
      current_items_count: currentItemsCount,
      current_weight_kg: currentWeightKg,
      current_volume_m3: currentVolumeM3,
      items_occupancy_percent: itemsOccupancyPercent,
      weight_occupancy_percent: weightOccupancyPercent,
      volume_occupancy_percent: volumeOccupancyPercent,
      is_full: Boolean(isFull),
    };

    const siteDetails: SiteDetails = {
      id: site.id,
      name: site.name,
      description: site.description,
      site_type: site.site_type,
      address: site.address,
      city: site.city,
      icon: site.icon,
      color: site.color,
      status: site.status,
      latitude: site.latitude,
      longitude: site.longitude,
      capacity_weight_kg: site.capacity_weight_kg,
      capacity_volume_m3: site.capacity_volume_m3,
      capacity_items_count: site.capacity_items_count,
      occupancy,
      items: siteItems,
    };

    return { success: true, data: siteDetails };
  } catch (error) {
    console.error('Exception récupération site:', error);
    return { success: false, error: 'Erreur inattendue' };
  }
}

/**
 * Action pour vérifier si un site peut accueillir un nouvel item
 */
export async function canSiteAccommodateItemAction(
  siteId: string,
  itemWeight?: number,
  itemVolume?: number
) {
  try {
    const result = await getSiteDetailsAction(siteId);

    if (!result.success || !result.data) {
      return { success: false, error: 'Impossible de vérifier la capacité du site' };
    }

    const site = result.data;
    const occupancy = site.occupancy;

    if (!occupancy) {
      return { success: true, canAccommodate: true, message: 'Aucune contrainte de capacité' };
    }

    // Vérifier chaque contrainte de capacité
    const checks = [];

    // Vérifier le nombre d'items
    if (site.capacity_items_count) {
      const wouldExceed = occupancy.current_items_count + 1 > site.capacity_items_count;
      checks.push({
        type: 'items',
        current: occupancy.current_items_count,
        capacity: site.capacity_items_count,
        wouldExceed,
      });
    }

    // Vérifier le poids
    if (site.capacity_weight_kg && itemWeight) {
      const newWeight = occupancy.current_weight_kg + itemWeight;
      const wouldExceed = newWeight > site.capacity_weight_kg;
      checks.push({
        type: 'weight',
        current: occupancy.current_weight_kg,
        capacity: site.capacity_weight_kg,
        wouldExceed,
      });
    }

    // Vérifier le volume
    if (site.capacity_volume_m3 && itemVolume) {
      const newVolume = occupancy.current_volume_m3 + itemVolume;
      const wouldExceed = newVolume > site.capacity_volume_m3;
      checks.push({
        type: 'volume',
        current: occupancy.current_volume_m3,
        capacity: site.capacity_volume_m3,
        wouldExceed,
      });
    }

    const hasExceededCapacity = checks.some(check => check.wouldExceed);

    if (hasExceededCapacity) {
      const exceededChecks = checks.filter(check => check.wouldExceed);
      const messages = exceededChecks.map(check => {
        if (check.type === 'items') return 'Nombre d\'items maximum atteint';
        if (check.type === 'weight') return 'Capacité en poids dépassée';
        if (check.type === 'volume') return 'Capacité en volume dépassée';
        return 'Capacité dépassée';
      });

      return {
        success: true,
        canAccommodate: false,
        message: messages.join(', '),
        checks,
      };
    }

    return {
      success: true,
      canAccommodate: true,
      message: 'Le site peut accueillir cet item',
      checks,
    };
  } catch (error) {
    console.error('Exception vérification capacité:', error);
    return { success: false, error: 'Erreur inattendue' };
  }
}
