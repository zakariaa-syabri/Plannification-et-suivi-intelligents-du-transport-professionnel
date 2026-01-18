/**
 * Hooks React Query pour la gestion des routes/missions
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseBrowserClient } from '@kit/supabase/browser-client';
import { useTransportStore } from '../stores/transport.store';
import type { Vehicle } from './use-vehicles';
import type { Site } from './use-sites';

// Types
export interface RouteStop {
  id: string;
  route_id: string;
  site_id: string;
  item_id: string | null;
  sequence_order: number;
  stop_type: 'start' | 'pickup' | 'delivery' | 'stop' | 'end';
  planned_arrival_time: string | null;
  planned_departure_time: string | null;
  actual_arrival_time: string | null;
  actual_departure_time: string | null;
  status: 'pending' | 'arrived' | 'completed' | 'skipped';
  notes: string | null;
  site?: Site;
}

export interface Route {
  id: string;
  organization_id: string;
  name: string;
  route_type: string;
  vehicle_id: string | null;
  scheduled_date: string;
  start_time: string;
  end_time: string | null;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  total_distance_km: number | null;
  estimated_duration_minutes: number | null;
  actual_duration_minutes: number | null;
  total_stops: number;
  optimization_result: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  vehicle?: Vehicle;
  stops?: RouteStop[];
}

export interface RouteCreate {
  name: string;
  route_type?: string;
  vehicle_id?: string;
  scheduled_date: string;
  start_time: string;
  end_time?: string;
  status?: Route['status'];
  metadata?: Record<string, unknown>;
}

export interface RouteUpdate extends Partial<RouteCreate> {}

export interface RouteStopCreate {
  site_id: string;
  item_id?: string;
  sequence_order: number;
  stop_type?: RouteStop['stop_type'];
  planned_arrival_time?: string;
  planned_departure_time?: string;
  notes?: string;
}

// Query Keys
export const routeKeys = {
  all: ['routes'] as const,
  lists: () => [...routeKeys.all, 'list'] as const,
  list: (orgId: string, filters?: Record<string, unknown>) =>
    [...routeKeys.lists(), orgId, filters] as const,
  details: () => [...routeKeys.all, 'detail'] as const,
  detail: (id: string) => [...routeKeys.details(), id] as const,
  today: (orgId: string) => [...routeKeys.all, 'today', orgId] as const,
  active: (orgId: string) => [...routeKeys.all, 'active', orgId] as const,
};

// Hooks

/**
 * Récupère la liste des routes
 */
export function useRoutes(filters?: {
  status?: string;
  vehicle_id?: string;
  scheduled_date?: string;
}) {
  const organizationId = useTransportStore((state) => state.organizationId);

  return useQuery({
    queryKey: routeKeys.list(organizationId!, filters),
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();

      let query = supabase
        .from('routes')
        .select(
          `
          *,
          vehicle:vehicles(id, name, vehicle_type, registration),
          stops:route_stops(
            id, site_id, sequence_order, stop_type, status,
            planned_arrival_time, actual_arrival_time,
            site:sites(id, name, latitude, longitude)
          )
        `
        )
        .eq('organization_id', organizationId!)
        .order('scheduled_date', { ascending: false })
        .order('start_time', { ascending: true });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.vehicle_id) {
        query = query.eq('vehicle_id', filters.vehicle_id);
      }
      if (filters?.scheduled_date) {
        query = query.eq('scheduled_date', filters.scheduled_date);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Route[];
    },
    enabled: !!organizationId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Récupère une route par ID avec tous les détails
 */
export function useRoute(id: string) {
  return useQuery({
    queryKey: routeKeys.detail(id),
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from('routes')
        .select(
          `
          *,
          vehicle:vehicles(*),
          stops:route_stops(
            *,
            site:sites(*)
          )
        `
        )
        .eq('id', id)
        .single();

      if (error) throw error;

      // Trier les stops par sequence_order
      if (data.stops) {
        data.stops.sort(
          (a: RouteStop, b: RouteStop) => a.sequence_order - b.sequence_order
        );
      }

      return data as Route;
    },
    enabled: !!id,
  });
}

/**
 * Récupère les routes du jour
 */
export function useTodayRoutes() {
  const organizationId = useTransportStore((state) => state.organizationId);
  const today = new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: routeKeys.today(organizationId!),
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from('routes')
        .select(
          `
          *,
          vehicle:vehicles(id, name, vehicle_type),
          stops:route_stops(count)
        `
        )
        .eq('organization_id', organizationId!)
        .eq('scheduled_date', today)
        .order('start_time');

      if (error) throw error;
      return data as Route[];
    },
    enabled: !!organizationId,
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchInterval: 5 * 60 * 1000, // Refresh toutes les 5 minutes
  });
}

/**
 * Récupère les routes actives (en cours)
 */
export function useActiveRoutes() {
  const organizationId = useTransportStore((state) => state.organizationId);
  const isTrackingEnabled = useTransportStore((state) => state.isTrackingEnabled);

  return useQuery({
    queryKey: routeKeys.active(organizationId!),
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from('routes')
        .select(
          `
          *,
          vehicle:vehicles(id, name, current_latitude, current_longitude)
        `
        )
        .eq('organization_id', organizationId!)
        .eq('status', 'in_progress');

      if (error) throw error;
      return data as Route[];
    },
    enabled: !!organizationId,
    refetchInterval: isTrackingEnabled ? 30000 : false, // 30 secondes si tracking activé
  });
}

/**
 * Crée une nouvelle route
 */
export function useCreateRoute() {
  const queryClient = useQueryClient();
  const organizationId = useTransportStore((state) => state.organizationId);

  return useMutation({
    mutationFn: async (data: RouteCreate) => {
      const supabase = getSupabaseBrowserClient();
      const { data: route, error } = await supabase
        .from('routes')
        .insert({
          ...data,
          organization_id: organizationId!,
        })
        .select()
        .single();

      if (error) throw error;
      return route as Route;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: routeKeys.lists() });
    },
  });
}

/**
 * Met à jour une route
 */
export function useUpdateRoute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: RouteUpdate }) => {
      const supabase = getSupabaseBrowserClient();
      const { data: route, error } = await supabase
        .from('routes')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return route as Route;
    },
    onSuccess: (route) => {
      queryClient.invalidateQueries({ queryKey: routeKeys.detail(route.id) });
      queryClient.invalidateQueries({ queryKey: routeKeys.lists() });
    },
  });
}

/**
 * Démarre une route
 */
export function useStartRoute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = getSupabaseBrowserClient();
      const { data: route, error } = await supabase
        .from('routes')
        .update({
          status: 'in_progress',
          started_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return route as Route;
    },
    onSuccess: (route) => {
      queryClient.invalidateQueries({ queryKey: routeKeys.detail(route.id) });
      queryClient.invalidateQueries({ queryKey: routeKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: routeKeys.active(route.organization_id),
      });
    },
  });
}

/**
 * Termine une route
 */
export function useCompleteRoute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = getSupabaseBrowserClient();

      // Récupérer l'heure de début pour calculer la durée
      const { data: existing } = await supabase
        .from('routes')
        .select('started_at')
        .eq('id', id)
        .single();

      const completedAt = new Date();
      let actualDuration: number | null = null;

      if (existing?.started_at) {
        const startTime = new Date(existing.started_at);
        actualDuration = Math.round(
          (completedAt.getTime() - startTime.getTime()) / 60000
        );
      }

      const { data: route, error } = await supabase
        .from('routes')
        .update({
          status: 'completed',
          completed_at: completedAt.toISOString(),
          actual_duration_minutes: actualDuration,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return route as Route;
    },
    onSuccess: (route) => {
      queryClient.invalidateQueries({ queryKey: routeKeys.detail(route.id) });
      queryClient.invalidateQueries({ queryKey: routeKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: routeKeys.active(route.organization_id),
      });
    },
  });
}

/**
 * Ajoute des arrêts à une route
 */
export function useAddRouteStops() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      routeId,
      stops,
    }: {
      routeId: string;
      stops: RouteStopCreate[];
    }) => {
      const supabase = getSupabaseBrowserClient();

      const stopsToInsert = stops.map((stop) => ({
        ...stop,
        route_id: routeId,
      }));

      const { data, error } = await supabase
        .from('route_stops')
        .insert(stopsToInsert)
        .select();

      if (error) throw error;

      // Mettre à jour le compteur de stops
      await supabase
        .from('routes')
        .update({ total_stops: stops.length })
        .eq('id', routeId);

      return data as RouteStop[];
    },
    onSuccess: (_, { routeId }) => {
      queryClient.invalidateQueries({ queryKey: routeKeys.detail(routeId) });
    },
  });
}

/**
 * Met à jour le statut d'un arrêt
 */
export function useUpdateStopStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      stopId,
      status,
      routeId,
    }: {
      stopId: string;
      status: RouteStop['status'];
      routeId: string;
    }) => {
      const supabase = getSupabaseBrowserClient();

      const updateData: Partial<RouteStop> = { status };

      if (status === 'arrived') {
        updateData.actual_arrival_time = new Date().toISOString();
      } else if (status === 'completed') {
        updateData.actual_departure_time = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('route_stops')
        .update(updateData)
        .eq('id', stopId)
        .select()
        .single();

      if (error) throw error;
      return { stop: data as RouteStop, routeId };
    },
    onSuccess: ({ routeId }) => {
      queryClient.invalidateQueries({ queryKey: routeKeys.detail(routeId) });
    },
  });
}

/**
 * Supprime une route
 */
export function useDeleteRoute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from('routes').delete().eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      queryClient.removeQueries({ queryKey: routeKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: routeKeys.lists() });
    },
  });
}
