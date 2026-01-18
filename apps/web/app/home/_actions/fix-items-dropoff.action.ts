'use server';

/**
 * Script de réparation pour corriger les items sans dropoff_site_id
 */

import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function fixItemsDropoffAction(organizationId: string) {
  const supabase = getSupabaseServerClient();

  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔧 RÉPARATION - Items sans dropoff_site_id');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // 1. Trouver tous les items SANS dropoff_site_id (tous statuts)
    const { data: brokenItems, error: itemsError } = await supabase
      .from('items')
      .select('id, name, status, pickup_site_id, dropoff_site_id')
      .eq('organization_id', organizationId)
      .is('dropoff_site_id', null);

    console.log(`🔎 Items sans dropoff_site_id trouvés: ${brokenItems?.length || 0}`);

    if (itemsError) {
      console.error('❌ Erreur récupération items:', itemsError);
      return { success: false, error: itemsError.message };
    }

    if (!brokenItems || brokenItems.length === 0) {
      console.log('✅ Aucun item à réparer - Tous les items ont un dropoff_site_id!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      return { success: true, fixed: 0, message: 'Rien à réparer' };
    }

    // Filtrer seulement ceux qui sont assigned ou in_transit
    const itemsToFix = brokenItems.filter(item =>
      item.status === 'assigned' || item.status === 'in_transit'
    );

    console.log(`📌 Items à réparer (assigned/in_transit): ${itemsToFix.length}`);

    if (itemsToFix.length === 0) {
      console.log('⚠️ Tous les items sans dropoff_site_id sont en status pending');
      console.log('   Ils recevront un dropoff_site_id lors de la création d\'une mission');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      return { success: true, fixed: 0, message: 'Items pending - pas de réparation nécessaire' };
    }

    console.log(`⚠️ ${brokenItems.length} items trouvés sans dropoff_site_id:`);
    brokenItems.forEach(item => {
      console.log(`   - ${item.name} (${item.status})`);
    });
    console.log('');

    // 2. Pour chaque item, trouver sa mission et le site de dropoff
    let fixedCount = 0;
    let failedCount = 0;

    for (const item of itemsToFix) {
      console.log(`🔍 Recherche mission pour: ${item.name} (${item.id})`);

      // Trouver les missions qui contiennent cet item
      const { data: missions, error: missionsError } = await supabase
        .from('routes')
        .select('id, name, assigned_items_ids, stops:route_stops(site_id, stop_type, sequence_order)')
        .eq('organization_id', organizationId)
        .contains('assigned_items_ids', [item.id]);

      if (missionsError) {
        console.log(`   ❌ Erreur recherche mission: ${missionsError.message}`);
        failedCount++;
        continue;
      }

      if (!missions || missions.length === 0) {
        console.log(`   ❌ Aucune mission trouvée pour ${item.name}`);
        console.log(`   💡 Cet item n'est pas assigné à une mission`);
        failedCount++;
        continue;
      }

      // Prendre la mission la plus récente
      const mission = missions[0];
      console.log(`   ✓ Mission trouvée: ${mission.name} (ID: ${mission.id})`);

      // Trouver les stops de dropoff dans cette mission
      const stops = (mission.stops as any[]) || [];
      console.log(`   📍 Stops dans la mission: ${stops.length}`);

      if (stops.length > 0) {
        stops.forEach(stop => {
          console.log(`      - ${stop.stop_type} (order: ${stop.sequence_order})`);
        });
      }

      const dropoffStops = stops.filter(s => s.stop_type === 'dropoff');

      if (dropoffStops.length === 0) {
        console.log(`   ❌ Aucun stop de dropoff dans la mission!`);
        console.log(`   💡 Cette mission n'a pas de destination définie`);
        failedCount++;
        continue;
      }

      // Prendre le premier dropoff (ou celui avec le plus grand sequence_order)
      const dropoffStop = dropoffStops.sort((a, b) => a.sequence_order - b.sequence_order)[0];
      console.log(`   ✓ Site de dropoff trouvé: ${dropoffStop.site_id} (stop ${dropoffStop.sequence_order})`);

      // Mettre à jour l'item
      const { error: updateError } = await supabase
        .from('items')
        .update({ dropoff_site_id: dropoffStop.site_id })
        .eq('id', item.id);

      if (updateError) {
        console.log(`   ❌ Erreur mise à jour: ${updateError.message}`);
        failedCount++;
      } else {
        console.log(`   ✅ ${item.name}: dropoff_site_id → ${dropoffStop.site_id}`);
        fixedCount++;
      }
    }

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 RÉSULTATS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Items réparés: ${fixedCount}`);
    console.log(`❌ Échecs: ${failedCount}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return {
      success: true,
      fixed: fixedCount,
      failed: failedCount,
      message: `${fixedCount} items réparés, ${failedCount} échecs`,
    };
  } catch (error) {
    console.error('Exception réparation:', error);
    return { success: false, error: 'Erreur inattendue' };
  }
}
