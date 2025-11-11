import { Home } from 'lucide-react';
import { z } from 'zod';

import { NavigationConfigSchema } from '@qwery/ui/navigation-schema';

import pathsConfig from './paths.config';

const iconClasses = 'w-4';

const getRoutes = () =>
  [
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
  ] satisfies z.infer<typeof NavigationConfigSchema>['routes'];

export function createPath(path: string, slug: string) {
  return path.replace('[slug]', slug);
}

export function createNavigationConfig(_slug: string) {
  return NavigationConfigSchema.parse({
    routes: getRoutes(),
  });
}
