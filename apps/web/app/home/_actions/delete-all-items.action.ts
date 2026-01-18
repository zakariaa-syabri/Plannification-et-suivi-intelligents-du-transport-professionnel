'use server';

/**
 * Action pour supprimer tous les items d'une organisation
 * Utilisé pour nettoyer la base de données et repartir de zéro
 */

import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { revalidatePath } from 'next/cache';

export async function deleteAllItemsAction(organizationId: string) {
  const supabase = getSupabaseServerClient();

  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🗑️ SUPPRESSION DE TOUS LES ITEMS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // 1. Compter les items avant suppression
    const { data: itemsBefore, error: countError } = await supabase
      .from('items')
      .select('id, name')
      .eq('organization_id', organizationId);

    if (countError) {
      console.error('❌ Erreur comptage items:', countError);
      return { success: false, error: countError.message };
    }

    const itemCount = itemsBefore?.length || 0;
    console.log(`📊 Items trouvés: ${itemCount}`);

    if (itemCount === 0) {
      console.log('✅ Aucun item à supprimer');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      return { success: true, deleted: 0, message: 'Aucun item à supprimer' };
    }

    // Afficher les items qui vont être supprimés
    console.log('\n📋 Items à supprimer:');
    itemsBefore.forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.name} (${item.id})`);
    });

    // 2. Supprimer tous les items de cette organisation
    console.log(`\n🗑️ Suppression de ${itemCount} items...`);
    const { error: deleteError } = await supabase
      .from('items')
      .delete()
      .eq('organization_id', organizationId);

    if (deleteError) {
      console.error('❌ Erreur suppression:', deleteError);
      return { success: false, error: deleteError.message };
    }

    // 3. Vérifier que tout est supprimé
    const { data: itemsAfter } = await supabase
      .from('items')
      .select('id')
      .eq('organization_id', organizationId);

    const remainingCount = itemsAfter?.length || 0;

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 RÉSULTAT');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Items supprimés: ${itemCount}`);
    console.log(`📌 Items restants: ${remainingCount}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Revalider la page pour rafraîchir les données
    revalidatePath('/home');

    return {
      success: true,
      deleted: itemCount,
      message: `${itemCount} items supprimés avec succès`,
    };
  } catch (error) {
    console.error('Exception suppression items:', error);
    return { success: false, error: 'Erreur inattendue' };
  }
}
