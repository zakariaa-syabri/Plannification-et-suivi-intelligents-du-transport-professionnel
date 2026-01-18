'use client';

/**
 * Hook: useRoleAccess
 * Fournit des utilitaires pour vérifier l'accès basé sur le rôle
 */

import { useUserRole } from '~/contexts';
import {
  hasAccessToRoute,
  getRedirectPath,
  filterNavigationRoutes,
  type AccessLevel,
} from '~/lib/role-based-routes';

export function useRoleAccess() {
  const { userType } = useUserRole();

  return {
    /**
     * Vérifier si l'utilisateur a accès à une route
     */
    canAccess: (route: string) => hasAccessToRoute(userType, route),

    /**
     * Obtenir la redirection si l'utilisateur n'a pas accès
     */
    getRedirectTo: (route: string) => getRedirectPath(userType, route),

    /**
     * Filtrer les routes de navigation
     */
    filterRoutes: (routes: any[]) => filterNavigationRoutes(userType, routes),

    /**
     * Obtenir le rôle actuel
     */
    userType,
  };
}
