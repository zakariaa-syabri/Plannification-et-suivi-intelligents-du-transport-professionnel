/**
 * Helper serveur pour récupérer l'organisation active de l'utilisateur
 */

'use server';

import { cache } from 'react';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import type { Organization } from '~/config/domains';

/**
 * Récupère l'organisation active de l'utilisateur connecté
 * Utilise React cache pour éviter les appels multiples dans le même render
 */
export const getCurrentOrganization = cache(async (): Promise<Organization | null> => {
  const supabase = getSupabaseServerClient();

  // Récupérer l'utilisateur connecté
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  try {
    // Récupérer l'organisation via organization_members
    // IMPORTANT: Filtrer uniquement les membres approuvés
    const { data: membership, error } = await supabase
      .from('organization_members')
      .select(`
        organization_id,
        role,
        organizations (
          id,
          owner_id,
          name,
          slug,
          domain_type,
          domain_config,
          description,
          logo_url,
          contact_email,
          contact_phone,
          status,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', user.id)
      .eq('approved', true)
      .maybeSingle();

    if (error || !membership || !membership.organizations) {
      return null;
    }

    // @ts-ignore - Type assertion pour organizations
    return membership.organizations as Organization;
  } catch (error) {
    console.error('Erreur dans getCurrentOrganization:', error);
    return null;
  }
});

/**
 * Récupère l'organisation et redirige vers onboarding si absent
 */
export async function requireOrganization(): Promise<Organization> {
  const organization = await getCurrentOrganization();

  if (!organization) {
    throw new Error('Organization required');
  }

  return organization;
}
