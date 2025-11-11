import {
  BorderedNavigationMenu,
  BorderedNavigationMenuItem,
} from '@qwery/ui/bordered-navigation-menu';

import { AccountDropdownContainer } from '~/components/account-dropdown-container';
import { AppLogo } from '~/components/app-logo';
import pathsConfig from '~/config/paths.config';
import { createNavigationConfig } from '~/config/qwery.navigation.config';
import { Route } from '~/types/app/routes/layout/+types/layout';

export function LayoutMenuNavigation(
  _props: Route.ComponentProps & React.PropsWithChildren,
) {
  const routes = createNavigationConfig('').routes.reduce<
    Array<{
      path: string;
      label: string;
      Icon?: React.ReactNode;
      end?: boolean | ((path: string) => boolean);
    }>
  >((acc, item) => {
    if ('children' in item) {
      return [...acc, ...item.children];
    }

    if ('divider' in item) {
      return acc;
    }

    return [...acc, item];
  }, []);

  return (
    <div className={'flex w-full flex-1 justify-between'}>
      <div className={'flex items-center space-x-8'}>
        <AppLogo href={pathsConfig.app.home} />

        <BorderedNavigationMenu>
          {routes.map((route) => (
            <BorderedNavigationMenuItem {...route} key={route.path} />
          ))}
        </BorderedNavigationMenu>
      </div>

      <div className={'flex justify-end space-x-2.5'}>
        <AccountDropdownContainer />
      </div>
    </div>
  );
}
