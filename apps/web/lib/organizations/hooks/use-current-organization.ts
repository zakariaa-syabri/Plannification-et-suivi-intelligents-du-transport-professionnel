/**
 * Hook pour récupérer l'organisation active de l'utilisateur
 */

'use client';

import { useEffect, useState } from 'react';
import { useSupabase } from '@kit/supabase/hooks/use-supabase';
import { useUser } from '@kit/supabase/hooks/use-user';
import type { Organization } from '~/config/domains';

export function useCurrentOrganization() {
  const supabase = useSupabase();
  const user = useUser();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchOrganization() {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        // Récupérer l'organisation de l'utilisateur via organization_members
        const { data: membership, error: membershipError } = await supabase
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
          .single();

        if (membershipError) {
          console.error('Erreur lors de la récupération de l\'organisation:', membershipError);
          setError(membershipError as Error);
          setOrganization(null);
          return;
        }

        if (membership && membership.organizations) {
          // @ts-ignore - Type assertion pour organizations
          setOrganization(membership.organizations as Organization);
        } else {
          setOrganization(null);
        }
      } catch (err) {
        console.error('Erreur dans useCurrentOrganization:', err);
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchOrganization();
  }, [user?.id, supabase]);

  return {
    organization,
    isLoading,
    error,
    hasOrganization: organization !== null,
    domainType: organization?.domain_type,
    domainConfig: organization?.domain_config,
  };
}
