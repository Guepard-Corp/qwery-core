import {
  BorderedNavigationMenu,
  BorderedNavigationMenuItem,
} from '@qwery/ui/bordered-navigation-menu';
import { NavigationConfigSchema } from '@qwery/ui/navigation-schema';
import { z } from 'zod/v3';

import { AccountDropdownContainer } from '~/components/account-dropdown-container';
import { AppLogo } from '~/components/app-logo';
import pathsConfig from '~/config/paths.config';
import { createNavigationConfig } from '~/config/qwery.navigation.config';
import { Route } from '~/types/app/routes/layout/+types/layout';

type NavigationConfig = z.infer<typeof NavigationConfigSchema>;
type RouteItem = NavigationConfig['routes'][number];

function flattenRoutes(items: RouteItem[]): Array<{
  path: string;
  label: string;
  Icon?: React.ReactNode;
  end?: boolean | ((path: string) => boolean);
}> {
  const result: Array<{
    path: string;
    label: string;
    Icon?: React.ReactNode;
    end?: boolean | ((path: string) => boolean);
  }> = [];

  for (const item of items) {
    if ('divider' in item) {
      continue;
    }

    if ('children' in item && item.children) {
      for (const child of item.children) {
        if ('path' in child && child.path) {
          result.push({
            path: child.path,
            label: child.label,
            Icon: child.Icon,
            end: child.end,
          });

          if ('children' in child && child.children) {
            for (const subChild of child.children) {
              if (subChild.path) {
                result.push({
                  path: subChild.path,
                  label: subChild.label,
                  Icon: subChild.Icon,
                  end: subChild.end,
                });
              }
            }
          }
        }
      }
    }
  }

  return result;
}

export function LayoutMenuNavigation(
  _props: Route.ComponentProps & React.PropsWithChildren,
) {
  const routes = flattenRoutes(createNavigationConfig('').routes);

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
