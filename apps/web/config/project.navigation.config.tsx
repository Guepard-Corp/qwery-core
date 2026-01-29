import { Database, Home, Notebook } from 'lucide-react';
import { z } from 'zod/v3';

import { NavigationConfigSchema } from '@qwery/ui/navigation-schema';

import pathsConfig, { createPath } from './paths.config';

const iconClasses = 'w-4';

const getRoutes = (slug: string | undefined) => {
  if (!slug) {
    return [
      {
        label: 'common:routes.project',
        children: [],
      },
    ] satisfies z.infer<typeof NavigationConfigSchema>['routes'];
  }

  return [
    {
      label: 'common:routes.project',
      children: [
        {
          label: 'common:routes.projectDashboard',
          path: createPath(pathsConfig.app.project, slug),
          Icon: <Home className={iconClasses} />,
          end: true,
        },
        {
          label: 'common:routes.datasources',
          path: createPath(pathsConfig.app.projectDatasources, slug),
          Icon: <Database className={iconClasses} />,
          end: true,
        },
        {
          label: 'common:routes.notebook',
          path: createPath(pathsConfig.app.projectNotebooks, slug),
          Icon: <Notebook className={iconClasses} />,
          end: true,
        },
      ],
    },
  ] satisfies z.infer<typeof NavigationConfigSchema>['routes'];
};

export function createNavigationConfig(slug: string | undefined) {
  return NavigationConfigSchema.parse({
    routes: getRoutes(slug),
  });
}

export function createDatasourcePath(slug: string, name: string) {
  return createPath(pathsConfig.app.newProjectDatasource, slug).replace(
    '[name]',
    name,
  );
}

export function createDatasourceViewPath(slug: string) {
  return createPath(pathsConfig.app.projectDatasourceView, slug);
}
