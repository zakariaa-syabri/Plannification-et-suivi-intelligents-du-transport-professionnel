'use client';

/**
 * Home Menu Navigation Content - Client Component
 * Affiche TOUTES les routes sans filtrage
 */

import {
  BorderedNavigationMenu,
  BorderedNavigationMenuItem,
} from '@kit/ui/bordered-navigation-menu';

interface HomeMenuNavigationContentProps {
  config: any;
}

export function HomeMenuNavigationContent({ config }: HomeMenuNavigationContentProps) {
  // Extraire toutes les routes sans filtrage
  const routes = config.routes
    .reduce<
      Array<{
        path: string;
        label: string;
        Icon?: React.ReactNode;
        end?: boolean | ((path: string) => boolean);
      }>
    >((acc, item) => {
      if ('children' in item) {
        // Ajouter tous les enfants
        return [...acc, ...item.children];
      }

      if ('divider' in item) {
        return acc;
      }

      // Ajouter toutes les routes simples
      return [...acc, item];
    }, []);

  return (
    <BorderedNavigationMenu>
      {routes.map((route) => (
        <BorderedNavigationMenuItem {...route} key={route.path} />
      ))}
    </BorderedNavigationMenu>
  );
}
