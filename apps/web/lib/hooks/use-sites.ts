/**
 * Hooks React Query pour la gestion des sites
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseBrowserClient } from '@kit/supabase/browser-client';
import { useTransportStore } from '../stores/transport.store';

// Types
export interface Site {
  id: string;
  organization_id: string;
  name: string;
  site_type: string;
  code: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string;
  latitude: number;
  longitude: number;
  is_active: boolean;
  is_depot: boolean;
  opening_time: string | null;
  closing_time: string | null;
  service_time_minutes: number;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface SiteCreate {
  name: string;
  site_type?: string;
  code?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  latitude: number;
  longitude: number;
  is_active?: boolean;
  is_depot?: boolean;
  opening_time?: string;
  closing_time?: string;
  service_time_minutes?: number;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  metadata?: Record<string, unknown>;
}

export interface SiteUpdate extends Partial<SiteCreate> {}

// Query Keys
export const siteKeys = {
  all: ['sites'] as const,
  lists: () => [...siteKeys.all, 'list'] as const,
  list: (orgId: string, filters?: Record<string, unknown>) =>
    [...siteKeys.lists(), orgId, filters] as const,
  details: () => [...siteKeys.all, 'detail'] as const,
  detail: (id: string) => [...siteKeys.details(), id] as const,
  depots: (orgId: string) => [...siteKeys.all, 'depots', orgId] as const,
  byType: (orgId: string, type: string) =>
    [...siteKeys.all, 'by-type', orgId, type] as const,
};

// Hooks

/**
 * Récupère la liste des sites
 */
export function useSites(filters?: {
  site_type?: string;
  is_active?: boolean;
  is_depot?: boolean;
}) {
  const organizationId = useTransportStore((state) => state.organizationId);

  return useQuery({
    queryKey: siteKeys.list(organizationId!, filters),
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();

      let query = supabase
        .from('sites')
        .select('*')
        .eq('organization_id', organizationId!)
        .order('name');

      if (filters?.site_type) {
        query = query.eq('site_type', filters.site_type);
      }
      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }
      if (filters?.is_depot !== undefined) {
        query = query.eq('is_depot', filters.is_depot);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Site[];
    },
    enabled: !!organizationId,
    staleTime: 10 * 60 * 1000, // 10 minutes (les sites changent peu)
  });
}

/**
 * Récupère un site par ID
 */
export function useSite(id: string) {
  return useQuery({
    queryKey: siteKeys.detail(id),
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from('sites')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Site;
    },
    enabled: !!id,
  });
}

/**
 * Récupère les dépôts
 */
export function useDepots() {
  const organizationId = useTransportStore((state) => state.organizationId);

  return useQuery({
    queryKey: siteKeys.depots(organizationId!),
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from('sites')
        .select('*')
        .eq('organization_id', organizationId!)
        .eq('is_depot', true)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data as Site[];
    },
    enabled: !!organizationId,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Crée un nouveau site
 */
export function useCreateSite() {
  const queryClient = useQueryClient();
  const organizationId = useTransportStore((state) => state.organizationId);

  return useMutation({
    mutationFn: async (data: SiteCreate) => {
      const supabase = getSupabaseBrowserClient();
      const { data: site, error } = await supabase
        .from('sites')
        .insert({
          ...data,
          organization_id: organizationId!,
        })
        .select()
        .single();

      if (error) throw error;
      return site as Site;
    },
    onSuccess: (site) => {
      queryClient.invalidateQueries({ queryKey: siteKeys.lists() });
      if (site.is_depot) {
        queryClient.invalidateQueries({
          queryKey: siteKeys.depots(site.organization_id),
        });
      }
    },
  });
}

/**
 * Met à jour un site
 */
export function useUpdateSite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: SiteUpdate }) => {
      const supabase = getSupabaseBrowserClient();
      const { data: site, error } = await supabase
        .from('sites')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return site as Site;
    },
    onSuccess: (site) => {
      queryClient.setQueryData(siteKeys.detail(site.id), site);
      queryClient.invalidateQueries({ queryKey: siteKeys.lists() });
    },
  });
}

/**
 * Supprime un site
 */
export function useDeleteSite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from('sites').delete().eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      queryClient.removeQueries({ queryKey: siteKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: siteKeys.lists() });
    },
  });
}

/**
 * Géocode une adresse et retourne les coordonnées
 */
export function useGeocode() {
  return useMutation({
    mutationFn: async (address: string) => {
      // Utiliser l'API Nominatim (OpenStreetMap)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          address
        )}&limit=1`,
        {
          headers: {
            'User-Agent': 'TransportApp/1.0',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Erreur de géocodage');
      }

      const data = await response.json();

      if (data.length === 0) {
        throw new Error('Adresse non trouvée');
      }

      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon),
        display_name: data[0].display_name,
      };
    },
  });
}
