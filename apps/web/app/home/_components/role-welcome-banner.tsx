'use client';

/**
 * Role Welcome Banner
 * Affiche un message de bienvenue personnalisé selon le rôle
 */

import { useUserRole } from '~/contexts';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Icons } from '~/config/icons.config';
import { Icon } from '~/components/ui/icon';

const ROLE_INFO: Record<string, { icon: any; title: string; description: string; color: string }> = {
  admin: {
    icon: Icons.security.verified,
    title: 'Mode Administrateur',
    description:
      'Vous avez accès complet au système. Vous pouvez gérer l\'organisation, les équipes, les missions et consulter les analyses.',
    color: 'bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800',
  },
  dispatcher: {
    icon: Icons.mission.mission,
    title: 'Mode Dispatcheur',
    description:
      'Vous pouvez planifier les missions, gérer les chauffeurs et suivre les livraisons en temps réel.',
    color: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800',
  },
  supervisor: {
    icon: Icons.status.pending,
    title: 'Mode Superviseur',
    description:
      'Vous pouvez superviser les opérations, consulter les missions et suivre les performances des chauffeurs.',
    color: 'bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800',
  },
  driver: {
    icon: Icons.mission.trip,
    title: 'Mode Chauffeur',
    description:
      'Consultez vos missions assignées, mettez à jour votre statut et communiquez avec le dispatcher.',
    color: 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800',
  },
  client: {
    icon: Icons.cargo.cargo,
    title: 'Mode Client',
    description:
      'Suivez vos livraisons en temps réel et consultez l\'historique de vos trajets.',
    color: 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800',
  },
  staff: {
    icon: Icons.ui.bell,
    title: 'Mode Personnel',
    description:
      'Vous pouvez consulter les informations de l\'organisation et gérer votre profil.',
    color: 'bg-gray-50 dark:bg-gray-950/20 border-gray-200 dark:border-gray-800',
  },
};

export function RoleWelcomeBanner() {
  const { userType, isLoading } = useUserRole();

  if (isLoading) {
    return null;
  }

  const info = ROLE_INFO[userType];

  if (!info) {
    return null;
  }

  return (
    <Card className={`${info.color} border`}>
      <CardContent className="pt-6">
        <div className="flex gap-4">
          <div className="flex-shrink-0">
            <Icon icon={info.icon} size="2xl" className="text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-lg mb-2">{info.title}</h2>
            <p className="text-sm text-muted-foreground">{info.description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
