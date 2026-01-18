/**
 * Role-Based Routes Configuration
 * Définit les routes disponibles pour chaque rôle utilisateur
 */

import type { UserType } from '~/contexts';

export type AccessLevel = 'full' | 'limited' | 'none';

/**
 * Configuration des routes par rôle
 * true = autorisé, false = non autorisé
 */
export const roleBasedAccess: Record<UserType, Record<string, boolean>> = {
  // Administrateur (owner) - ACCÈS COMPLET À TOUT
  admin: {
    // Tous les accès sont true pour l'admin
  },

  // Dispatcheur - Peut voir le map builder et gérer les missions
  dispatcher: {
    '/home': true,              // Map Builder
    '/home/settings': true,
    '/home/settings/configuration': false,
    '/home/team': false,        // Pas d'accès au team manager
    '/home/driver': true,
    '/home/client': true,
  },

  // Superviseur - Similaire au dispatcheur
  supervisor: {
    '/home': true,              // Map Builder
    '/home/settings': true,
    '/home/settings/configuration': false,
    '/home/team': false,
    '/home/driver': true,
    '/home/client': true,
  },

  // Chauffeur - Seulement son dashboard
  driver: {
    '/home': false,
    '/home/settings': true,
    '/home/settings/configuration': false,
    '/home/team': false,
    '/home/driver': true,       // Driver Dashboard
    '/home/client': false,
  },

  // Client - Seulement le suivi de ses commandes
  client: {
    '/home': false,
    '/home/settings': true,
    '/home/settings/configuration': false,
    '/home/team': false,
    '/home/driver': false,
    '/home/client': true,       // Client Dashboard
  },

  // Personnel (staff) - Doit être assigné un rôle par l'admin
  staff: {
    '/home': false,
    '/home/settings': true,
    '/home/settings/configuration': false,
    '/home/team': false,
    '/home/driver': false,
    '/home/client': false,
  },
};

/**
 * Routes de redirection par défaut selon le rôle
 */
export const defaultRouteByRole: Record<UserType, string> = {
  admin: '/home',
  dispatcher: '/home',
  supervisor: '/home',
  driver: '/home/driver',
  client: '/home/client',
  staff: '/home/settings',
};

/**
 * Vérifier si un rôle a accès à une route
 */
export function hasAccessToRoute(userType: UserType, route: string): boolean {
  // Les admins ont TOUJOURS accès à tout
  if (userType === 'admin') {
    return true;
  }

  // Normaliser la route
  let normalizedRoute = route.split('?')[0].split('#')[0]; // Enlever query params et hash

  // Vérifier l'accès exact
  if (normalizedRoute in roleBasedAccess[userType]) {
    return roleBasedAccess[userType][normalizedRoute];
  }

  // Vérifier les routes parentes
  const parts = normalizedRoute.split('/').filter(Boolean);
  for (let i = parts.length; i > 0; i--) {
    const parentRoute = '/' + parts.slice(0, i).join('/');
    if (parentRoute in roleBasedAccess[userType]) {
      return roleBasedAccess[userType][parentRoute];
    }
  }

  return false;
}

/**
 * Obtenir la page de redirection recommandée selon le rôle et la route
 */
export function getRedirectPath(userType: UserType, currentPath: string): string | null {
  if (hasAccessToRoute(userType, currentPath)) {
    return null; // Pas de redirection nécessaire
  }

  return defaultRouteByRole[userType];
}

/**
 * Filtrer les routes de navigation selon le rôle
 */
export function filterNavigationRoutes(
  userType: UserType,
  routes: Array<{
    label: string;
    path?: string;
    children?: Array<{ label: string; path: string }>;
  }>
) {
  return routes
    .map((route) => {
      // Si le groupe a des enfants, les filtrer
      if ('children' in route && route.children) {
        const filteredChildren = route.children.filter((child) =>
          hasAccessToRoute(userType, child.path)
        );

        // Si aucun enfant n'est accessible, masquer le groupe
        if (filteredChildren.length === 0) {
          return null;
        }

        return {
          ...route,
          children: filteredChildren,
        };
      }

      // Si la route n'a pas de path (groupe), la garder
      if (!('path' in route)) {
        return route;
      }

      // Filtrer les routes simples
      if (hasAccessToRoute(userType, route.path)) {
        return route;
      }

      return null;
    })
    .filter(Boolean);
}
