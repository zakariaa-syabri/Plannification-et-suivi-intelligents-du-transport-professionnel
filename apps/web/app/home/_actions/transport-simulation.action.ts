'use server';

/**
 * Server Actions pour simuler le transport réaliste des items
 * Gère les pickups, dropoffs et mises à jour des statuts pendant une mission
 */

import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { revalidatePath } from 'next/cache';

/**
 * Action pour démarrer une mission
 * Met tous les items assignés à la mission en statut "assigned"
 */
export async function startMissionAction(missionId: string) {
  try {
    const supabase = getSupabaseServerClient();

    // Récupérer la mission avec ses arrêts
    const { data: mission, error: missionError } = await supabase
      .from('routes')
      .select('*, assigned_items_ids')
      .eq('id', missionId)
      .single();

    if (missionError || !mission) {
      return { success: false, error: 'Mission non trouvée' };
    }

    // Mettre à jour le statut de la mission
    await supabase
      .from('routes')
      .update({ status: 'in_progress', actual_start_time: new Date().toISOString() })
      .eq('id', missionId);

    // Mettre à jour le statut des items assignés à "assigned"
    if (mission.assigned_items_ids && mission.assigned_items_ids.length > 0) {
      await supabase
        .from('items')
        .update({ status: 'assigned' })
        .in('id', mission.assigned_items_ids);
    }

    revalidatePath('/home');
    return { success: true, message: 'Mission démarrée' };
  } catch (error) {
    console.error('Erreur démarrage mission:', error);
    return { success: false, error: 'Erreur inattendue' };
  }
}

/**
 * Action pour gérer l'arrivée du véhicule à un arrêt
 * Gère le pickup (ramassage) ou dropoff (livraison) selon le type d'arrêt
 */
export async function processStopAction(
  missionId: string,
  stopId: string,
  siteId: string,
  stopType: 'pickup' | 'dropoff' | 'waypoint' | 'depot'
) {
  try {
    const supabase = getSupabaseServerClient();

    // Récupérer l'arrêt et ses items
    const { data: stop, error: stopError } = await supabase
      .from('route_stops')
      .select('*')
      .eq('id', stopId)
      .single();

    if (stopError || !stop) {
      return { success: false, error: 'Arrêt non trouvé' };
    }

    const itemIds = stop.item_ids || [];

    if (itemIds.length === 0) {
      // Pas d'items à ce stop, juste marquer comme complété
      await supabase
        .from('route_stops')
        .update({
          status: 'completed',
          actual_arrival_time: new Date().toISOString(),
          actual_departure_time: new Date().toISOString(),
        })
        .eq('id', stopId);

      return { success: true, itemsProcessed: 0, stopType };
    }

    // Traiter selon le type d'arrêt
    if (stopType === 'pickup') {
      // RAMASSAGE : Mettre les items en transit
      await supabase
        .from('items')
        .update({
          status: 'in_transit',
          // On pourrait aussi mettre à jour la position actuelle si nécessaire
        })
        .in('id', itemIds);

      console.log(`✅ Pickup: ${itemIds.length} items ramassés du site ${siteId}`);
    } else if (stopType === 'dropoff') {
      // LIVRAISON : Marquer les items comme livrés et mettre à jour leur localisation
      await supabase
        .from('items')
        .update({
          status: 'delivered',
          dropoff_site_id: siteId, // Mettre à jour le site de livraison
        })
        .in('id', itemIds);

      console.log(`✅ Dropoff: ${itemIds.length} items livrés au site ${siteId}`);
    }

    // Mettre à jour le statut de l'arrêt
    await supabase
      .from('route_stops')
      .update({
        status: 'completed',
        actual_arrival_time: new Date().toISOString(),
        actual_departure_time: new Date().toISOString(),
      })
      .eq('id', stopId);

    revalidatePath('/home');
    return {
      success: true,
      itemsProcessed: itemIds.length,
      stopType,
      message: stopType === 'pickup'
        ? `${itemIds.length} items ramassés`
        : `${itemIds.length} items livrés`,
    };
  } catch (error) {
    console.error('Erreur traitement arrêt:', error);
    return { success: false, error: 'Erreur inattendue' };
  }
}

/**
 * Action pour terminer une mission
 * Vérifie que tous les arrêts sont complétés et marque la mission comme terminée
 */
export async function completeMissionAction(missionId: string) {
  try {
    const supabase = getSupabaseServerClient();

    // Récupérer la mission
    const { data: mission, error: missionError } = await supabase
      .from('routes')
      .select('*, assigned_items_ids')
      .eq('id', missionId)
      .single();

    if (missionError || !mission) {
      return { success: false, error: 'Mission non trouvée' };
    }

    // Vérifier tous les arrêts
    const { data: stops } = await supabase
      .from('route_stops')
      .select('*')
      .eq('route_id', missionId);

    const allCompleted = stops?.every(stop => stop.status === 'completed') ?? false;

    if (!allCompleted) {
      return { success: false, error: 'Tous les arrêts ne sont pas complétés' };
    }

    // Mettre à jour le statut de la mission
    await supabase
      .from('routes')
      .update({
        status: 'completed',
        actual_end_time: new Date().toISOString(),
      })
      .eq('id', missionId);

    // S'assurer que tous les items assignés sont bien livrés
    if (mission.assigned_items_ids && mission.assigned_items_ids.length > 0) {
      await supabase
        .from('items')
        .update({ status: 'delivered' })
        .in('id', mission.assigned_items_ids)
        .eq('status', 'in_transit'); // Seulement ceux qui sont encore en transit
    }

    revalidatePath('/home');
    return { success: true, message: 'Mission terminée avec succès' };
  } catch (error) {
    console.error('Erreur fin de mission:', error);
    return { success: false, error: 'Erreur inattendue' };
  }
}

/**
 * Action pour obtenir l'état actuel d'une mission
 */
export async function getMissionStatusAction(missionId: string) {
  try {
    const supabase = getSupabaseServerClient();

    const { data: mission, error: missionError } = await supabase
      .from('routes')
      .select(`
        *,
        route_stops:route_stops(*)
      `)
      .eq('id', missionId)
      .single();

    if (missionError || !mission) {
      return { success: false, error: 'Mission non trouvée' };
    }

    const stops = (mission as any).route_stops || [];
    const completedStops = stops.filter((s: any) => s.status === 'completed').length;
    const totalStops = stops.length;
    const progress = totalStops > 0 ? (completedStops / totalStops) * 100 : 0;

    return {
      success: true,
      data: {
        status: mission.status,
        progress,
        completedStops,
        totalStops,
        startTime: mission.actual_start_time,
        endTime: mission.actual_end_time,
      },
    };
  } catch (error) {
    console.error('Erreur récupération statut mission:', error);
    return { success: false, error: 'Erreur inattendue' };
  }
}

/**
 * Action pour simuler le pickup d'items à un site spécifique
 * Utilisée quand le véhicule arrive à un site de pickup
 * Met à jour la localisation actuelle des items (ils sont maintenant dans le véhicule)
 */
export async function pickupItemsFromSiteAction(siteId: string, missionId: string) {
  try {
    const supabase = getSupabaseServerClient();

    // Récupérer le site pour obtenir ses coordonnées
    const { data: site } = await supabase
      .from('sites')
      .select('*')
      .eq('id', siteId)
      .single();

    // Récupérer tous les items en attente à ce site pour cette mission
    const { data: mission } = await supabase
      .from('routes')
      .select('assigned_items_ids, vehicle:vehicles(id, current_latitude, current_longitude)')
      .eq('id', missionId)
      .single();

    if (!mission?.assigned_items_ids) {
      return { success: true, itemsPickedUp: 0 };
    }

    // Trouver les items de cette mission qui sont à ce site
    const { data: items } = await supabase
      .from('items')
      .select('*')
      .in('id', mission.assigned_items_ids)
      .eq('pickup_site_id', siteId)
      .in('status', ['pending', 'assigned']);

    console.log(`🔍 Pickup check - Site: ${siteId}, Items trouvés: ${items?.length || 0}`);

    if (!items || items.length === 0) {
      console.log(`⚠️ Aucun item à ramasser au site ${site?.name}`);
      return { success: true, itemsPickedUp: 0 };
    }

    const itemIds = items.map(item => item.id);
    console.log(`📦 Items à ramasser: ${items.map(i => `${i.name} (→ dropoff: ${i.dropoff_site_id})`).join(', ')}`);

    // 1. Mettre les items en transit
    const { error: updateError } = await supabase
      .from('items')
      .update({
        status: 'in_transit',
        current_location_latitude: site?.latitude || null,
        current_location_longitude: site?.longitude || null,
      })
      .in('id', itemIds);

    if (updateError) {
      console.error('❌ Erreur mise à jour items en transit:', updateError);
      return { success: false, error: updateError.message };
    }

    // 2. NOUVEAU: Charger les items dans le véhicule
    const { data: vehicle } = await supabase
      .from('vehicles')
      .select('id, name, current_loaded_items')
      .eq('id', mission.vehicle.id)
      .single();

    if (vehicle) {
      const currentLoaded = vehicle.current_loaded_items || [];
      const newLoaded = [...new Set([...currentLoaded, ...itemIds])]; // Éviter les doublons

      const { error: vehicleError } = await supabase
        .from('vehicles')
        .update({ current_loaded_items: newLoaded })
        .eq('id', vehicle.id);

      if (vehicleError) {
        console.error('❌ Erreur chargement items dans véhicule:', vehicleError);
      } else {
        console.log(`🚚 Véhicule ${vehicle.name}: ${newLoaded.length} items chargés`);
        console.log(`✅ Pickup à ${site?.name || siteId}: ${itemIds.length} items ramassés`);
      }
    }

    revalidatePath('/home');
    return {
      success: true,
      itemsPickedUp: itemIds.length,
      items: items.map(i => ({ id: i.id, name: i.name })),
      siteName: site?.name,
    };
  } catch (error) {
    console.error('Erreur pickup items:', error);
    return { success: false, error: 'Erreur inattendue' };
  }
}

/**
 * Action pour simuler le dropoff d'items à un site spécifique
 * Utilisée quand le véhicule arrive à un site de livraison
 * Met à jour la localisation finale des items et leur adresse
 */
export async function dropoffItemsAtSiteAction(siteId: string, missionId: string) {
  try {
    const supabase = getSupabaseServerClient();

    // Récupérer le site de destination
    const { data: site } = await supabase
      .from('sites')
      .select('*')
      .eq('id', siteId)
      .single();

    // Récupérer la mission avec le véhicule
    const { data: mission } = await supabase
      .from('routes')
      .select('assigned_items_ids, vehicle:vehicles(id, name, current_loaded_items)')
      .eq('id', missionId)
      .single();

    if (!mission?.assigned_items_ids) {
      return { success: true, itemsDelivered: 0 };
    }

    // NOUVEAU: Récupérer les items actuellement dans le véhicule
    const vehicle = mission.vehicle as any;
    const loadedItemIds = vehicle?.current_loaded_items || [];

    console.log(`🔍 Dropoff check - Site: ${siteId}`);
    console.log(`🚚 Items dans le véhicule: ${loadedItemIds.length}`);

    if (loadedItemIds.length === 0) {
      console.log(`⚠️ Le véhicule est vide - aucun item à décharger`);
      return { success: true, itemsDelivered: 0 };
    }

    // NOUVEAU: Décharger TOUS les items du véhicule à ce site
    // (ou seulement ceux dont le dropoff_site_id correspond si défini)
    const { data: items } = await supabase
      .from('items')
      .select('*')
      .in('id', loadedItemIds)
      .eq('status', 'in_transit');

    console.log(`📦 Items à décharger: ${items?.length || 0}`);

    if (!items || items.length === 0) {
      console.log(`⚠️ Aucun item à livrer au site ${site?.name}`);
      return { success: true, itemsDelivered: 0 };
    }

    const itemIds = items.map(item => item.id);
    console.log(`📍 Items à livrer: ${items.map(i => i.name).join(', ')}`);

    // 1. Marquer les items comme livrés ET les placer à ce site
    const { error: updateError } = await supabase
      .from('items')
      .update({
        status: 'delivered',
        dropoff_site_id: siteId, // IMPORTANT: Définir le site de livraison final
        current_location_latitude: site?.latitude || null,
        current_location_longitude: site?.longitude || null,
        metadata: {
          delivered_at: new Date().toISOString(),
          delivery_site: site?.name,
          delivery_address: site?.address,
        },
      })
      .in('id', itemIds);

    if (updateError) {
      console.error('❌ Erreur mise à jour items livrés:', updateError);
      return { success: false, error: updateError.message };
    }

    // 2. NOUVEAU: Décharger les items du véhicule
    if (vehicle) {
      const remainingItems = loadedItemIds.filter(id => !itemIds.includes(id));

      const { error: vehicleError } = await supabase
        .from('vehicles')
        .update({ current_loaded_items: remainingItems })
        .eq('id', vehicle.id);

      if (vehicleError) {
        console.error('❌ Erreur déchargement véhicule:', vehicleError);
      } else {
        console.log(`🚚 Véhicule ${vehicle.name}: ${itemIds.length} items déchargés, ${remainingItems.length} restants`);
        console.log(`✅ Dropoff à ${site?.name || siteId}: ${itemIds.length} items livrés`);
      }
    }

    revalidatePath('/home');
    return {
      success: true,
      itemsDelivered: itemIds.length,
      items: items.map(i => ({ id: i.id, name: i.name })),
      siteName: site?.name,
      siteAddress: site?.address,
    };
  } catch (error) {
    console.error('Erreur dropoff items:', error);
    return { success: false, error: 'Erreur inattendue' };
  }
}
