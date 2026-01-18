'use client';

/**
 * UNAUTHORIZED PAGE
 * Affichée quand un utilisateur tente d'accéder à une page non autorisée
 */

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Button } from '@kit/ui/button';
import { useUserRole } from '~/contexts';
import { defaultRouteByRole } from '~/lib/role-based-routes';
import { Icons } from '~/config/icons.config';
import { Icon } from '~/components/ui/icon';

export default function UnauthorizedPage() {
  const router = useRouter();
  const { userType, isLoading } = useUserRole();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Icon icon={Icons.ui.loading} size="xl" className="animate-spin" />
      </div>
    );
  }

  const defaultRoute = defaultRouteByRole[userType];

  return (
    <div className="flex items-center justify-center h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl">
            <Icon icon={Icons.security.lock} size="lg" className="text-red-500" />
            Accès refusé
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-900 dark:text-red-100">
              Vous n'avez pas la permission d'accéder à cette page.
            </p>
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-xs text-blue-900 dark:text-blue-100 mb-2">
              <strong>Votre rôle:</strong>
            </p>
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 capitalize">
              {userType === 'admin' && '👨‍💼 Administrateur'}
              {userType === 'dispatcher' && '📦 Dispatcheur'}
              {userType === 'supervisor' && '👁️ Superviseur'}
              {userType === 'driver' && '🚗 Chauffeur'}
              {userType === 'client' && '👤 Client'}
              {userType === 'staff' && '👷 Personnel'}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Les pages disponibles pour votre rôle sont affichées dans le menu.
            </p>
            <p className="text-xs text-muted-foreground">
              Si vous pensez qu'il y a une erreur, contactez votre administrateur.
            </p>
          </div>

          <Button
            className="w-full"
            onClick={() => router.push(defaultRoute)}
          >
            <Icon icon={Icons.ui.right} size="sm" className="mr-2" />
            Retour à l'accueil
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
