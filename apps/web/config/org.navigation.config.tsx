import { List } from 'lucide-react';
import { z } from 'zod';

import { NavigationConfigSchema } from '@qwery/ui/navigation-schema';

import pathsConfig from './paths.config';
import { createPath } from './qwery.navigation.config';

const iconClasses = 'w-4';

const getRoutes = (slug: string) =>
  [
    {
      label: 'common:routes.organization',
      children: [
        {
          label: 'common:routes.projects',
          path: createPath(pathsConfig.app.organizationView, slug),
          Icon: <List className={iconClasses} />,
          end: true,
        },
      ],
    },
  ] satisfies z.infer<typeof NavigationConfigSchema>['routes'];

export function createNavigationConfig(slug: string) {
  return NavigationConfigSchema.parse({
    routes: getRoutes(slug),
  });
}
