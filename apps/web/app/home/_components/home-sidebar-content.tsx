'use client';

/**
 * Home Sidebar Content - Client Component
 * Affiche TOUTES les routes sans filtrage
 */

import { SidebarContent, SidebarNavigation } from '@kit/ui/shadcn-sidebar';

interface HomeSidebarContentProps {
  config: any;
}

export function HomeSidebarContent({ config }: HomeSidebarContentProps) {
  // Afficher toutes les routes sans filtrage
  return (
    <SidebarContent>
      <SidebarNavigation config={config} />
    </SidebarContent>
  );
}
