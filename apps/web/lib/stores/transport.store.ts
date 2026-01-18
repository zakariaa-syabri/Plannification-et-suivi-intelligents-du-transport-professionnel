/**
 * Store Zustand pour le module Transport
 * Gestion de l'état global de l'application transport
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// Types
interface MapState {
  center: [number, number];
  zoom: number;
  selectedEntityId: string | null;
  selectedEntityType: 'vehicle' | 'site' | 'item' | 'route' | null;
}

interface FilterState {
  vehicleStatus: string | null;
  vehicleType: string | null;
  siteType: string | null;
  routeStatus: string | null;
  dateRange: { start: Date | null; end: Date | null };
  searchQuery: string;
}

interface TransportState {
  // Organisation
  organizationId: string | null;
  setOrganizationId: (id: string | null) => void;

  // Map state
  map: MapState;
  setMapCenter: (center: [number, number]) => void;
  setMapZoom: (zoom: number) => void;
  selectEntity: (id: string | null, type: MapState['selectedEntityType']) => void;
  clearSelection: () => void;

  // Filters
  filters: FilterState;
  setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  resetFilters: () => void;

  // UI State
  activePanel: 'vehicle' | 'site' | 'item' | 'route' | null;
  setActivePanel: (panel: TransportState['activePanel']) => void;
  isSidebarOpen: boolean;
  toggleSidebar: () => void;

  // Real-time tracking
  isTrackingEnabled: boolean;
  toggleTracking: () => void;
  trackingInterval: number;
  setTrackingInterval: (ms: number) => void;
}

const defaultFilters: FilterState = {
  vehicleStatus: null,
  vehicleType: null,
  siteType: null,
  routeStatus: null,
  dateRange: { start: null, end: null },
  searchQuery: '',
};

const defaultMapState: MapState = {
  center: [48.8566, 2.3522], // Paris
  zoom: 13,
  selectedEntityId: null,
  selectedEntityType: null,
};

export const useTransportStore = create<TransportState>()(
  devtools(
    persist(
      (set) => ({
        // Organisation
        organizationId: null,
        setOrganizationId: (id) => set({ organizationId: id }),

        // Map
        map: defaultMapState,
        setMapCenter: (center) =>
          set((state) => ({ map: { ...state.map, center } })),
        setMapZoom: (zoom) =>
          set((state) => ({ map: { ...state.map, zoom } })),
        selectEntity: (id, type) =>
          set((state) => ({
            map: { ...state.map, selectedEntityId: id, selectedEntityType: type },
          })),
        clearSelection: () =>
          set((state) => ({
            map: { ...state.map, selectedEntityId: null, selectedEntityType: null },
          })),

        // Filters
        filters: defaultFilters,
        setFilter: (key, value) =>
          set((state) => ({ filters: { ...state.filters, [key]: value } })),
        resetFilters: () => set({ filters: defaultFilters }),

        // UI
        activePanel: null,
        setActivePanel: (panel) => set({ activePanel: panel }),
        isSidebarOpen: true,
        toggleSidebar: () =>
          set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

        // Tracking
        isTrackingEnabled: false,
        toggleTracking: () =>
          set((state) => ({ isTrackingEnabled: !state.isTrackingEnabled })),
        trackingInterval: 10000, // 10 secondes par défaut
        setTrackingInterval: (ms) => set({ trackingInterval: ms }),
      }),
      {
        name: 'transport-store',
        partialize: (state) => ({
          organizationId: state.organizationId,
          map: { center: state.map.center, zoom: state.map.zoom },
          filters: state.filters,
          isSidebarOpen: state.isSidebarOpen,
          trackingInterval: state.trackingInterval,
        }),
      }
    ),
    { name: 'TransportStore' }
  )
);

// Selectors pour optimiser les re-renders
export const useOrganizationId = () =>
  useTransportStore((state) => state.organizationId);

export const useMapState = () => useTransportStore((state) => state.map);

export const useFilters = () => useTransportStore((state) => state.filters);

export const useSelectedEntity = () =>
  useTransportStore((state) => ({
    id: state.map.selectedEntityId,
    type: state.map.selectedEntityType,
  }));
