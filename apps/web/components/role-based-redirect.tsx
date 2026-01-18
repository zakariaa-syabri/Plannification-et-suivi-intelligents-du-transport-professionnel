'use client';

/**
 * Role-Based Redirect Component
 * Redirige automatiquement l'utilisateur vers son dashboard approprié
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserRole, type UserType } from '~/contexts';
import { Icon } from '~/components/ui/icon';
import { Icons } from '~/config/icons.config';

// Mapping des types d'utilisateurs vers leurs dashboards
const DASHBOARD_ROUTES: Record<UserType, string> = {
  admin: '/home',           // Dashboard admin complet (Map Builder)
  dispatcher: '/home',      // Dashboard dispatcher (Map Builder)
  supervisor: '/home',      // Dashboard superviseur
  staff: '/home',           // Dashboard personnel
  driver: '/home/driver',   // Dashboard chauffeur mobile
  client: '/home/client',   // Dashboard client/passager
};

interface RoleBasedRedirectProps {
  children?: React.ReactNode;
  allowedRoles?: UserType[];
  fallbackRoute?: string;
}

export function RoleBasedRedirect({
  children,
  allowedRoles,
  fallbackRoute,
}: RoleBasedRedirectProps) {
  const router = useRouter();
  const { userType, isLoading, profile } = useUserRole();

  useEffect(() => {
    if (isLoading) return;

    // Si des rôles spécifiques sont requis, vérifier l'accès
    if (allowedRoles && allowedRoles.length > 0) {
      if (!allowedRoles.includes(userType)) {
        // Rediriger vers le fallback ou le dashboard par défaut du rôle
        router.replace(fallbackRoute || DASHBOARD_ROUTES[userType]);
      }
    }
  }, [isLoading, userType, allowedRoles, fallbackRoute, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Icon icon={Icons.ui.loading} size="xl" className="animate-spin mb-4" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  // Si accès autorisé, afficher le contenu
  if (!allowedRoles || allowedRoles.includes(userType)) {
    return <>{children}</>;
  }

  // Sinon, ne rien afficher (la redirection va se faire)
  return null;
}

// Component pour automatiquement rediriger vers le bon dashboard
export function AutoRedirectToDashboard() {
  const router = useRouter();
  const { userType, isLoading } = useUserRole();

  useEffect(() => {
    if (!isLoading) {
      const targetRoute = DASHBOARD_ROUTES[userType] || '/home';
      router.replace(targetRoute);
    }
  }, [isLoading, userType, router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <Icon icon={Icons.ui.loading} size="xl" className="animate-spin mb-4" />
        <p className="text-muted-foreground">Redirection en cours...</p>
      </div>
    </div>
  );
}

// Hook pour obtenir la route dashboard de l'utilisateur courant
export function useDashboardRoute() {
  const { userType, isLoading } = useUserRole();
  return {
    route: DASHBOARD_ROUTES[userType] || '/home',
    isLoading,
  };
}
