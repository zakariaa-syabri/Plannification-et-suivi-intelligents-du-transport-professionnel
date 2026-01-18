'use server';

/**
 * Action pour vérifier que tout le système est correctement configuré
 */

import { getSupabaseServerClient } from '@kit/supabase/server-client';

// Types pour la réponse
type VehicleInfo = {
  id: string;
  name: string;
  loadedCount: number;
  loadedItemIds: string[];
};

type SiteInfo = {
  id: string;
  name: string;
  waitingCount: number;
  deliveredCount: number;
  waitingItems: Array<{ id: string; name: string; status: string }>;
  deliveredItems: Array<{ id: string; name: string; status: string }>;
};

type StatusCounts = {
  [status: string]: number;
};

type OrphanItem = {
  id: string;
  name: string;
  status: string;
  pickup_site_id: string | null;
  dropoff_site_id: string | null;
};

type VerificationResult = {
  success: boolean;
  error?: string;
  columnExists: boolean;
  totalItems: number;
  statusCounts: StatusCounts;
  itemsWithDropoff: number;
  deliveredItems: number;
  sites: SiteInfo[];
  vehicles: VehicleInfo[];
  orphanItems: OrphanItem[];
};

export async function verifySetupAction(organizationId: string): Promise<VerificationResult> {
  const supabase = getSupabaseServerClient();

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 VÉRIFICATION DU SYSTÈME');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    // 1. Vérifier que le champ current_loaded_items existe sur vehicles
    console.log('\n1️⃣ Vérification de la colonne current_loaded_items...');
    const { data: vehicles, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('id, name, current_loaded_items')
      .eq('organization_id', organizationId)
      .limit(1);

    let columnExists = true;
    if (vehiclesError) {
      console.error('❌ Erreur:', vehiclesError.message);
      if (vehiclesError.message.includes('current_loaded_items')) {
        console.error('⚠️ La colonne current_loaded_items n\'existe pas!');
        console.error('   Vous devez appliquer la migration manuellement.');
        columnExists = false;
        return {
          success: false,
          error: 'Migration non appliquée',
          columnExists: false,
          totalItems: 0,
          statusCounts: {},
          itemsWithDropoff: 0,
          deliveredItems: 0,
          sites: [],
          vehicles: [],
          orphanItems: [],
        };
      }
    } else {
      console.log('✅ Colonne current_loaded_items existe!');
      if (vehicles && vehicles.length > 0) {
        console.log(`   Véhicule test: ${vehicles[0].name}`);
        console.log(`   current_loaded_items: ${JSON.stringify(vehicles[0].current_loaded_items || [])}`);
      }
    }

    // 2. Vérifier les items et leur état
    console.log('\n2️⃣ État des items...');
    const { data: allItems } = await supabase
      .from('items')
      .select('id, name, status, pickup_site_id, dropoff_site_id')
      .eq('organization_id', organizationId);

    const byStatus = (allItems || []).reduce((acc: any, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {});

    console.log('   Items par status:');
    Object.entries(byStatus).forEach(([status, count]) => {
      console.log(`   - ${status}: ${count}`);
    });

    const withDropoff = (allItems || []).filter(i => i.dropoff_site_id).length;
    const delivered = (allItems || []).filter(i => i.status === 'delivered').length;

    console.log(`   Items avec dropoff_site_id: ${withDropoff} / ${allItems?.length || 0}`);
    console.log(`   Items delivered: ${delivered}`);

    // 2.5 Identifier les items orphelins (sans pickup_site_id)
    const orphanItems = (allItems || []).filter(item => !item.pickup_site_id);
    console.log(`\n⚠️ Items ORPHELINS (sans pickup_site_id): ${orphanItems.length}`);
    if (orphanItems.length > 0) {
      orphanItems.forEach(item => {
        console.log(`   - ${item.name} (${item.status})`);
        console.log(`     pickup_site_id: ${item.pickup_site_id || 'NULL ❌'}`);
        console.log(`     dropoff_site_id: ${item.dropoff_site_id || 'NULL ❌'}`);
      });
    }

    // 3. Vérifier les sites et leurs items
    console.log('\n3️⃣ Items par site...');
    const { data: sites } = await supabase
      .from('sites')
      .select('id, name')
      .eq('organization_id', organizationId);

    const sitesInfo: SiteInfo[] = [];

    if (sites) {
      for (const site of sites) { // TOUS les sites
        // Items au pickup
        const { data: atPickup } = await supabase
          .from('items')
          .select('id, name, status')
          .eq('pickup_site_id', site.id)
          .in('status', ['pending', 'assigned']);

        // Items livrés
        const { data: delivered } = await supabase
          .from('items')
          .select('id, name, status')
          .eq('dropoff_site_id', site.id)
          .eq('status', 'delivered');

        console.log(`   📍 ${site.name}:`);
        console.log(`      - En attente: ${atPickup?.length || 0}`);
        console.log(`      - Livrés: ${delivered?.length || 0}`);

        if (delivered && delivered.length > 0) {
          delivered.forEach(item => {
            console.log(`         ✅ ${item.name} (${item.status})`);
          });
        }

        sitesInfo.push({
          id: site.id,
          name: site.name,
          waitingCount: atPickup?.length || 0,
          deliveredCount: delivered?.length || 0,
          waitingItems: atPickup || [],
          deliveredItems: delivered || [],
        });
      }
    }

    // 4. Vérifier les véhicules et leur chargement
    console.log('\n4️⃣ État des véhicules...');
    const { data: allVehicles } = await supabase
      .from('vehicles')
      .select('id, name, current_loaded_items')
      .eq('organization_id', organizationId);

    const vehiclesInfo: VehicleInfo[] = [];

    if (allVehicles) {
      allVehicles.forEach(vehicle => {
        const loaded = vehicle.current_loaded_items || [];
        console.log(`   🚚 ${vehicle.name}: ${loaded.length} items chargés`);
        if (loaded.length > 0) {
          console.log(`      IDs: ${loaded.join(', ')}`);
        }

        vehiclesInfo.push({
          id: vehicle.id,
          name: vehicle.name,
          loadedCount: loaded.length,
          loadedItemIds: loaded,
        });
      });
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Vérification terminée!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return {
      success: true,
      columnExists,
      totalItems: allItems?.length || 0,
      statusCounts: byStatus,
      itemsWithDropoff: withDropoff,
      deliveredItems: delivered,
      sites: sitesInfo,
      vehicles: vehiclesInfo,
      orphanItems: orphanItems.map(item => ({
        id: item.id,
        name: item.name,
        status: item.status,
        pickup_site_id: item.pickup_site_id,
        dropoff_site_id: item.dropoff_site_id,
      })),
    };
  } catch (error) {
    console.error('Exception:', error);
    return {
      success: false,
      error: 'Erreur inattendue',
      columnExists: false,
      totalItems: 0,
      statusCounts: {},
      itemsWithDropoff: 0,
      deliveredItems: 0,
      sites: [],
      vehicles: [],
      orphanItems: [],
    };
  }
}
