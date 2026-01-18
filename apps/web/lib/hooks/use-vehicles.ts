/**
 * Hooks React Query pour la gestion des véhicules
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseBrowserClient } from '@kit/supabase/browser-client';
import { useTransportStore } from '../stores/transport.store';

// Types
export interface Vehicle {
  id: string;
  organization_id: string;
  name: string;
  vehicle_type: string;
  registration: string | null;
  capacity: number | null;
  capacity_unit: string;
  status: 'available' | 'in_service' | 'maintenance' | 'out_of_service';
  is_active: boolean;
  current_latitude: number | null;
  current_longitude: number | null;
  last_position_update: string | null;
  brand: string | null;
  model: string | null;
  year: number | null;
  color: string | null;
  equipment: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface VehicleCreate {
  name: string;
  vehicle_type?: string;
  registration?: string;
  capacity?: number;
  capacity_unit?: string;
  status?: Vehicle['status'];
  is_active?: boolean;
  current_latitude?: number;
  current_longitude?: number;
  brand?: string;
  model?: string;
  year?: number;
  color?: string;
  equipment?: string[];
  metadata?: Record<string, unknown>;
}

export interface VehicleUpdate extends Partial<VehicleCreate> {}

// Query Keys
export const vehicleKeys = {
  all: ['vehicles'] as const,
  lists: () => [...vehicleKeys.all, 'list'] as const,
  list: (orgId: string, filters?: Record<string, unknown>) =>
    [...vehicleKeys.lists(), orgId, filters] as const,
  details: () => [...vehicleKeys.all, 'detail'] as const,
  detail: (id: string) => [...vehicleKeys.details(), id] as const,
  available: (orgId: string) => [...vehicleKeys.all, 'available', orgId] as const,
  withLocation: (orgId: string) =>
    [...vehicleKeys.all, 'with-location', orgId] as const,
};

// Hooks

/**
 * Récupère la liste des véhicules
 */
export function useVehicles(filters?: {
  status?: string;
  vehicle_type?: string;
  is_active?: boolean;
}) {
  const organizationId = useTransportStore((state) => state.organizationId);

  return useQuery({
    queryKey: vehicleKeys.list(organizationId!, filters),
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();

      let query = supabase
        .from('vehicles')
        .select('*')
        .eq('organization_id', organizationId!)
        .order('name');

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.vehicle_type) {
        query = query.eq('vehicle_type', filters.vehicle_type);
      }
      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Vehicle[];
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Récupère un véhicule par ID
 */
export function useVehicle(id: string) {
  return useQuery({
    queryKey: vehicleKeys.detail(id),
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Vehicle;
    },
    enabled: !!id,
  });
}

/**
 * Récupère les véhicules disponibles
 */
export function useAvailableVehicles() {
  const organizationId = useTransportStore((state) => state.organizationId);

  return useQuery({
    queryKey: vehicleKeys.available(organizationId!),
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('organization_id', organizationId!)
        .eq('status', 'available')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data as Vehicle[];
    },
    enabled: !!organizationId,
    staleTime: 1 * 60 * 1000, // 1 minute (plus fréquent car état change souvent)
  });
}

/**
 * Récupère les véhicules avec position GPS
 */
export function useVehiclesWithLocation() {
  const organizationId = useTransportStore((state) => state.organizationId);
  const isTrackingEnabled = useTransportStore((state) => state.isTrackingEnabled);
  const trackingInterval = useTransportStore((state) => state.trackingInterval);

  return useQuery({
    queryKey: vehicleKeys.withLocation(organizationId!),
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('organization_id', organizationId!)
        .eq('is_active', true)
        .not('current_latitude', 'is', null)
        .not('current_longitude', 'is', null);

      if (error) throw error;
      return data as Vehicle[];
    },
    enabled: !!organizationId,
    refetchInterval: isTrackingEnabled ? trackingInterval : false,
  });
}

/**
 * Crée un nouveau véhicule
 */
export function useCreateVehicle() {
  const queryClient = useQueryClient();
  const organizationId = useTransportStore((state) => state.organizationId);

  return useMutation({
    mutationFn: async (data: VehicleCreate) => {
      const supabase = getSupabaseBrowserClient();
      const { data: vehicle, error } = await supabase
        .from('vehicles')
        .insert({
          ...data,
          organization_id: organizationId!,
        })
        .select()
        .single();

      if (error) throw error;
      return vehicle as Vehicle;
    },
    onSuccess: () => {
      // Invalider les listes pour forcer un refetch
      queryClient.invalidateQueries({ queryKey: vehicleKeys.lists() });
    },
  });
}

/**
 * Met à jour un véhicule
 */
export function useUpdateVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: VehicleUpdate }) => {
      const supabase = getSupabaseBrowserClient();
      const { data: vehicle, error } = await supabase
        .from('vehicles')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return vehicle as Vehicle;
    },
    onSuccess: (vehicle) => {
      // Mettre à jour le cache
      queryClient.setQueryData(vehicleKeys.detail(vehicle.id), vehicle);
      queryClient.invalidateQueries({ queryKey: vehicleKeys.lists() });
    },
  });
}

/**
 * Supprime un véhicule
 */
export function useDeleteVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from('vehicles').delete().eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      queryClient.removeQueries({ queryKey: vehicleKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: vehicleKeys.lists() });
    },
  });
}

/**
 * Met à jour la position GPS d'un véhicule
 */
export function useUpdateVehicleLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      latitude,
      longitude,
    }: {
      id: string;
      latitude: number;
      longitude: number;
    }) => {
      const supabase = getSupabaseBrowserClient();
      const { data: vehicle, error } = await supabase
        .from('vehicles')
        .update({
          current_latitude: latitude,
          current_longitude: longitude,
          last_position_update: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return vehicle as Vehicle;
    },
    onSuccess: (vehicle) => {
      queryClient.setQueryData(vehicleKeys.detail(vehicle.id), vehicle);
      // Ne pas invalider les listes pour éviter trop de refetch
      // Les listes avec location ont leur propre intervalle de refetch
    },
  });
}

/**
 * Change le statut d'un véhicule
 */
export function useUpdateVehicleStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: Vehicle['status'];
    }) => {
      const supabase = getSupabaseBrowserClient();
      const { data: vehicle, error } = await supabase
        .from('vehicles')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return vehicle as Vehicle;
    },
    onSuccess: (vehicle) => {
      queryClient.setQueryData(vehicleKeys.detail(vehicle.id), vehicle);
      queryClient.invalidateQueries({ queryKey: vehicleKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: vehicleKeys.available(vehicle.organization_id),
      });
    },
  });
}
