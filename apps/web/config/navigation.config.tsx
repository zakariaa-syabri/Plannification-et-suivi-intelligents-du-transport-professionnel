import { Home, User, Users, Truck, Package, Settings } from 'lucide-react';
import { z } from 'zod';

import { NavigationConfigSchema } from '@kit/ui/navigation-schema';

import pathsConfig from '~/config/paths.config';

const iconClasses = 'w-4';

const routes = [
  {
    label: 'common:routes.application',
    children: [
      {
        label: 'common:routes.home',
        path: pathsConfig.app.home,
        Icon: <Home className={iconClasses} />,
        end: true,
      },
    ],
  },
  {
    label: 'common:routes.management',
    children: [
      {
        label: 'common:routes.team',
        path: pathsConfig.app.team,
        Icon: <Users className={iconClasses} />,
      },
      {
        label: 'common:routes.driverDashboard',
        path: pathsConfig.app.driver,
        Icon: <Truck className={iconClasses} />,
      },
      {
        label: 'common:routes.clientDashboard',
        path: pathsConfig.app.client,
        Icon: <Package className={iconClasses} />,
      },
    ],
  },
  {
    label: 'common:routes.settings',
    children: [
      {
        label: 'common:routes.configuration',
        path: '/home/settings/configuration',
        Icon: <Settings className={iconClasses} />,
      },
      {
        label: 'common:routes.profile',
        path: pathsConfig.app.profileSettings,
        Icon: <User className={iconClasses} />,
      },
    ],
  },
] satisfies z.infer<typeof NavigationConfigSchema>['routes'];

export const navigationConfig = NavigationConfigSchema.parse({
  routes,
  style: process.env.NEXT_PUBLIC_NAVIGATION_STYLE,
  sidebarCollapsed: process.env.NEXT_PUBLIC_HOME_SIDEBAR_COLLAPSED,
});
