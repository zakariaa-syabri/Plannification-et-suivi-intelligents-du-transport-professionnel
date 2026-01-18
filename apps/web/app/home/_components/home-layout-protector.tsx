'use client';

/**
 * Home Layout Protector
 * Vérifie l'accès à chaque route et redirige si nécessaire
 */

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUserRole } from '~/contexts';
import { getRedirectPath, defaultRouteByRole } from '~/lib/role-based-routes';
import { Icon } from '~/components/ui/icon';
import { Icons } from '~/config/icons.config';

interface HomeLayoutProtectorProps {
  children: React.ReactNode;
}

export function HomeLayoutProtector({ children }: HomeLayoutProtectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { userType, isLoading } = useUserRole();

  useEffect(() => {
    if (isLoading) return;

    // Vérifier l'accès à la route courante
    const redirectTo = getRedirectPath(userType, pathname);

    if (redirectTo) {
      console.warn(
        `❌ [ROUTE PROTECTION] ${userType} n'a pas accès à ${pathname}, redirection vers ${redirectTo}`
      );
      router.replace(redirectTo);
    } else {
      console.log(`✅ [ROUTE PROTECTION] ${userType} a accès à ${pathname}`);
    }
  }, [userType, pathname, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Icon icon={Icons.ui.loading} size="xl" className="animate-spin" />
      </div>
    );
  }

  // Vérifier si l'accès est refusé pour le rendu
  const redirectTo = getRedirectPath(userType, pathname);
  if (redirectTo) {
    // En train de rediriger...
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Icon icon={Icons.ui.loading} size="2xl" className="animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Vérification d'accès en cours...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
