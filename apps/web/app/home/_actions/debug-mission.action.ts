'use server';

/**
 * Outil de debug pour analyser une mission complète
 * Vérifie tous les arrêts, items et leur traitement
 */

import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function debugMissionAction(missionId: string) {
  const supabase = getSupabaseServerClient();

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 DEBUG MISSION COMPLÈTE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    // 1. Récupérer la mission complète
    const { data: mission, error: missionError } = await supabase
      .from('routes')
      .select(`
        *,
        vehicle:vehicles(id, name, current_loaded_items),
        stops:route_stops(
          id,
          site_id,
          sequence_order,
          stop_type,
          status,
          item_ids,
          site:sites(id, name, address)
        )
      `)
      .eq('id', missionId)
      .single();

    if (missionError || !mission) {
      console.error('❌ Mission non trouvée:', missionError);
      return { success: false, error: 'Mission non trouvée' };
    }

    console.log('\n📋 MISSION:', mission.name);
    console.log('   Status:', mission.status);
    console.log('   Véhicule:', (mission.vehicle as any)?.name);
    console.log('   Items assignés:', mission.assigned_items_ids?.length || 0);

    if (mission.assigned_items_ids && mission.assigned_items_ids.length > 0) {
      console.log('   IDs:', mission.assigned_items_ids.join(', '));
    }

    // 2. Analyser tous les arrêts
    const stops = (mission as any).stops || [];
    console.log(`\n📍 ARRÊTS: ${stops.length} total`);

    stops.forEach((stop: any, index: number) => {
      console.log(`\n   [${index + 1}] ${stop.stop_type.toUpperCase()} - ${stop.site?.name || stop.site_id}`);
      console.log(`       Ordre: ${stop.sequence_order}`);
      console.log(`       Status: ${stop.status}`);
      console.log(`       Items associés: ${stop.item_ids?.length || 0}`);

      if (stop.item_ids && stop.item_ids.length > 0) {
        console.log(`       Item IDs: ${stop.item_ids.join(', ')}`);
      } else {
        console.log('       ⚠️ AUCUN ITEM ASSOCIÉ à cet arrêt !');
      }
    });

    // 3. Récupérer les détails de chaque item de la mission
    if (mission.assigned_items_ids && mission.assigned_items_ids.length > 0) {
      console.log('\n📦 ITEMS DE LA MISSION:');

      const { data: items } = await supabase
        .from('items')
        .select(`
          id,
          name,
          status,
          pickup_site_id,
          dropoff_site_id,
          pickup_site:sites!items_pickup_site_id_fkey(id, name),
          dropoff_site:sites!items_dropoff_site_id_fkey(id, name)
        `)
        .in('id', mission.assigned_items_ids);

      if (items) {
        items.forEach((item: any, index: number) => {
          console.log(`\n   [${index + 1}] ${item.name}`);
          console.log(`       Status: ${item.status}`);
          console.log(`       Pickup: ${item.pickup_site?.name || item.pickup_site_id || 'NULL ❌'}`);
          console.log(`       Dropoff: ${item.dropoff_site?.name || item.dropoff_site_id || 'NULL ❌'}`);

          // Vérifier si cet item est dans un arrêt pickup
          const pickupStop = stops.find((s: any) =>
            s.stop_type === 'pickup' &&
            s.site_id === item.pickup_site_id
          );

          if (pickupStop) {
            const isInStop = pickupStop.item_ids?.includes(item.id);
            if (isInStop) {
              console.log(`       ✅ Trouvé dans l'arrêt pickup: ${pickupStop.site?.name}`);
            } else {
              console.log(`       ❌ PROBLÈME: Site de pickup trouvé mais item PAS dans item_ids !`);
            }
          } else {
            console.log(`       ❌ PROBLÈME: Aucun arrêt pickup pour ce site !`);
          }
        });
      }
    }

    // 4. Analyser l'état du véhicule
    const vehicle = mission.vehicle as any;
    console.log('\n🚚 VÉHICULE:', vehicle?.name);
    console.log('   Items chargés:', vehicle?.current_loaded_items?.length || 0);
    if (vehicle?.current_loaded_items && vehicle.current_loaded_items.length > 0) {
      console.log('   IDs:', vehicle.current_loaded_items.join(', '));
    }

    // 5. Résumé des problèmes potentiels
    console.log('\n⚠️ DIAGNOSTIC:');

    let hasProblems = false;

    // Vérifier que tous les items ont un arrêt pickup
    if (mission.assigned_items_ids) {
      const itemsWithoutPickupStop = mission.assigned_items_ids.filter((itemId: string) => {
        return !stops.some((stop: any) =>
          stop.stop_type === 'pickup' &&
          stop.item_ids?.includes(itemId)
        );
      });

      if (itemsWithoutPickupStop.length > 0) {
        console.log(`   ❌ ${itemsWithoutPickupStop.length} item(s) sans arrêt pickup !`);
        console.log(`      IDs: ${itemsWithoutPickupStop.join(', ')}`);
        hasProblems = true;
      }
    }

    // Vérifier que tous les stops pickup ont des items
    const pickupStopsWithoutItems = stops.filter((stop: any) =>
      stop.stop_type === 'pickup' && (!stop.item_ids || stop.item_ids.length === 0)
    );

    if (pickupStopsWithoutItems.length > 0) {
      console.log(`   ⚠️ ${pickupStopsWithoutItems.length} arrêt(s) pickup sans items`);
      hasProblems = true;
    }

    // Vérifier les sites dupliqués
    const pickupSites = stops
      .filter((s: any) => s.stop_type === 'pickup')
      .map((s: any) => s.site_id);

    const duplicates = pickupSites.filter((site: string, index: number) =>
      pickupSites.indexOf(site) !== index
    );

    if (duplicates.length > 0) {
      console.log(`   ⚠️ Sites de pickup dupliqués: ${duplicates.join(', ')}`);
    }

    if (!hasProblems) {
      console.log('   ✅ Structure de la mission semble correcte');
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Debug terminé');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return { success: true };
  } catch (error) {
    console.error('Exception debug mission:', error);
    return { success: false, error: 'Erreur inattendue' };
  }
}
