'use client';

/**
 * Settings Button Component
 * Bouton pour accéder à la configuration de l'organisation
 */

import Link from 'next/link';
import { Button } from '@kit/ui/button';
import { Icons } from '~/config/icons.config';
import { Icon } from '~/components/ui/icon';

export function SettingsButton() {
  return (
    <Link href="/home/settings/configuration">
      <Button
        variant="ghost"
        size="sm"
        title="Paramètres de l'organisation"
      >
        <Icon icon={Icons.settings.settings} size="md" />
      </Button>
    </Link>
  );
}
