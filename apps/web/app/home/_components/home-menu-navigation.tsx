import { AppLogo } from '~/components/app-logo';
import { ProfileAccountDropdownContainer } from '~/components/personal-account-dropdown-container';
import { NotificationBell } from '~/components/notification-bell';
import { navigationConfig } from '~/config/navigation.config';
import { HomeMenuNavigationContent } from './home-menu-navigation-content';

export function HomeMenuNavigation() {
  return (
    <div className={'flex w-full flex-1 justify-between'}>
      <div className={'flex items-center space-x-8'}>
        <AppLogo />

        <HomeMenuNavigationContent config={navigationConfig} />
      </div>

      <div className={'flex items-center justify-end space-x-2.5'}>
        <NotificationBell />
        <div>
          <ProfileAccountDropdownContainer showProfileName={false} />
        </div>
      </div>
    </div>
  );
}
