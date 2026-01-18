'use client';

/**
 * Role Protected Page Component
 * Enveloppe une page pour vérifier l'accès basé sur le rôle
 * Redirige automatiquement si l'accès est refusé
 */

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUserRole } from '~/contexts';
import { getRedirectPath } from '~/lib/role-based-routes';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Button } from '@kit/ui/button';
import { Icons } from '~/config/icons.config';
import { Icon } from '~/components/ui/icon';

interface RoleProtectedPageProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export function RoleProtectedPage({ children, allowedRoles }: RoleProtectedPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { userType, isLoading } = useUserRole();

  useEffect(() => {
    if (isLoading) return;

    // Vérifier l'accès
    const redirectTo = getRedirectPath(userType, pathname);

    if (redirectTo) {
      // Pas d'accès, rediriger
      console.warn(`❌ [ACCESS] ${userType} n'a pas accès à ${pathname}, redirection vers ${redirectTo}`);
      router.push(redirectTo);
    } else {
      console.log(`✅ [ACCESS] ${userType} a accès à ${pathname}`);
    }
  }, [userType, pathname, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Icon icon={Icons.ui.loading} size="xl" className="animate-spin" />
      </div>
    );
  }

  // Vérifier encore une fois pour le rendu
  const redirectTo = getRedirectPath(userType, pathname);
  if (redirectTo) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon icon={Icons.security.lock} size="lg" />
              Accès refusé
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Votre rôle <strong>({userType})</strong> n'a pas accès à cette page.
            </p>
            <p className="text-sm text-muted-foreground">
              Vous allez être redirigé automatiquement...
            </p>
            <Button
              className="w-full"
              onClick={() => router.push(redirectTo)}
            >
              Rediriger maintenant
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
