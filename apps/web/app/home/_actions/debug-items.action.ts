'use server';

/**
 * Action de débogage pour vérifier l'état des items
 */

import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function debugItemsAction(organizationId: string) {
  const supabase = getSupabaseServerClient();

  try {
    // Récupérer TOUS les items
    const { data: items, error } = await supabase
      .from('items')
      .select('id, name, status, pickup_site_id, dropoff_site_id, created_at')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erreur récupération items:', error);
      return { success: false, error: error.message };
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 DEBUG - ÉTAT DE TOUS LES ITEMS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Total items: ${items?.length || 0}`);
    console.log('');

    if (items && items.length > 0) {
      items.forEach((item, index) => {
        console.log(`[${index + 1}] ${item.name}`);
        console.log(`    ID: ${item.id}`);
        console.log(`    Status: ${item.status}`);
        console.log(`    Pickup Site: ${item.pickup_site_id || 'NON DÉFINI ❌'}`);
        console.log(`    Dropoff Site: ${item.dropoff_site_id || 'NON DÉFINI ❌'}`);
        console.log(`    Créé le: ${new Date(item.created_at).toLocaleString()}`);
        console.log('');
      });

      // Statistiques
      const byStatus = items.reduce((acc: any, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
      }, {});

      const withDropoff = items.filter(i => i.dropoff_site_id).length;
      const delivered = items.filter(i => i.status === 'delivered').length;
      const deliveredWithDropoff = items.filter(i => i.status === 'delivered' && i.dropoff_site_id).length;

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📊 STATISTIQUES');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Status:');
      Object.entries(byStatus).forEach(([status, count]) => {
        console.log(`  - ${status}: ${count}`);
      });
      console.log('');
      console.log(`Items avec dropoff_site_id: ${withDropoff} / ${items.length}`);
      console.log(`Items delivered: ${delivered}`);
      console.log(`Items delivered AVEC dropoff_site_id: ${deliveredWithDropoff} / ${delivered}`);
      console.log('');

      if (delivered > 0 && deliveredWithDropoff < delivered) {
        console.warn('⚠️ PROBLÈME DÉTECTÉ: Des items sont "delivered" mais n\'ont pas de dropoff_site_id!');
        console.warn('   Ces items ne peuvent pas apparaître au site de destination.');
        console.log('');
        console.log('Items delivered SANS dropoff_site_id:');
        items
          .filter(i => i.status === 'delivered' && !i.dropoff_site_id)
          .forEach(item => {
            console.log(`  - ${item.name} (ID: ${item.id})`);
          });
      }

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }

    return { success: true, data: items };
  } catch (error) {
    console.error('Exception debug items:', error);
    return { success: false, error: 'Erreur inattendue' };
  }
}
