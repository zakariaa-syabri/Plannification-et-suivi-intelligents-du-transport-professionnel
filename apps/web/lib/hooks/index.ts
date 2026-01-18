/**
 * Export centralisé de tous les hooks React Query
 */

// Vehicles
export {
  useVehicles,
  useVehicle,
  useAvailableVehicles,
  useVehiclesWithLocation,
  useCreateVehicle,
  useUpdateVehicle,
  useDeleteVehicle,
  useUpdateVehicleLocation,
  useUpdateVehicleStatus,
  vehicleKeys,
  type Vehicle,
  type VehicleCreate,
  type VehicleUpdate,
} from './use-vehicles';

// Sites
export {
  useSites,
  useSite,
  useDepots,
  useCreateSite,
  useUpdateSite,
  useDeleteSite,
  useGeocode,
  siteKeys,
  type Site,
  type SiteCreate,
  type SiteUpdate,
} from './use-sites';

// Routes
export {
  useRoutes,
  useRoute,
  useTodayRoutes,
  useActiveRoutes,
  useCreateRoute,
  useUpdateRoute,
  useStartRoute,
  useCompleteRoute,
  useAddRouteStops,
  useUpdateStopStatus,
  useDeleteRoute,
  routeKeys,
  type Route,
  type RouteCreate,
  type RouteUpdate,
  type RouteStop,
  type RouteStopCreate,
} from './use-routes';

// Notifications
export {
  useNotifications,
  useNotificationPermission,
  type Notification,
} from './use-notifications';
