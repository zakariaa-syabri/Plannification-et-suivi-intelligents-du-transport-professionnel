'use client';

/**
 * First Time Welcome Component
 * Affiche un message de bienvenue la première fois après création d'org
 */

import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Button } from '@kit/ui/button';
import { Icons } from '~/config/icons.config';
import { Icon } from '~/components/ui/icon';

export function FirstTimeWelcome() {
  const searchParams = useSearchParams();
  const isFirstTime = searchParams.get('first') === 'true';
  const isWelcome = searchParams.get('welcome') === 'true';

  if (!isFirstTime || !isWelcome) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <Icon icon={Icons.status.success} size="lg" className="text-green-600 dark:text-green-400" />
          Bienvenue dans votre organisation!
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">🎉 Vous êtes maintenant dispatcheur de cette organisation</p>
          <p className="text-sm text-muted-foreground">
            Vous pouvez maintenant:
          </p>
          <ul className="text-sm text-muted-foreground space-y-1 ml-4">
            <li>✅ Ajouter des véhicules et des sites</li>
            <li>✅ Créer et planifier des missions</li>
            <li>✅ Gérer votre équipe (ajouter des chauffeurs, clients, etc.)</li>
            <li>✅ Consulter les analyses et rapports</li>
          </ul>
        </div>

        <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded border border-amber-200 dark:border-amber-800">
          <p className="text-xs text-amber-900 dark:text-amber-100">
            <strong>💡 Conseil:</strong> Commencez par ajouter vos véhicules et sites via le menu à gauche, puis créez vos première mission!
          </p>
        </div>

        <Button asChild className="w-full">
          <a href="/home/team">
            <Icon icon={Icons.action.add} size="sm" className="mr-2" />
            Ajouter mon équipe
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}
