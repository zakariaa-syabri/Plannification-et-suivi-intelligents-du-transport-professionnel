'use server';

/**
 * Server Actions pour supprimer des entités
 */

import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { revalidatePath } from 'next/cache';

export async function deleteVehicleAction(vehicleId: string) {
  try {
    const supabase = getSupabaseServerClient();

    const { error } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', vehicleId);

    if (error) {
      console.error('Erreur suppression véhicule:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/home');
    return { success: true };
  } catch (error) {
    console.error('Exception suppression véhicule:', error);
    return { success: false, error: 'Erreur inattendue' };
  }
}

export async function deleteSiteAction(siteId: string) {
  try {
    const supabase = getSupabaseServerClient();

    const { error } = await supabase
      .from('sites')
      .delete()
      .eq('id', siteId);

    if (error) {
      console.error('Erreur suppression site:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/home');
    return { success: true };
  } catch (error) {
    console.error('Exception suppression site:', error);
    return { success: false, error: 'Erreur inattendue' };
  }
}

export async function deleteItemAction(itemId: string) {
  try {
    const supabase = getSupabaseServerClient();

    const { error } = await supabase
      .from('items')
      .delete()
      .eq('id', itemId);

    if (error) {
      console.error('Erreur suppression item:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/home');
    return { success: true };
  } catch (error) {
    console.error('Exception suppression item:', error);
    return { success: false, error: 'Erreur inattendue' };
  }
}
