import React from 'react';

import { Database, Settings, Table } from 'lucide-react';
import { z } from 'zod/v3';

import { NavigationConfigSchema } from '@qwery/ui/navigation-schema';

import pathsConfig from './paths.config';
import { createPath } from './qwery.navigation.config';

const iconClasses = 'w-4';

const getRoutes = (slug: string) =>
  [
    {
      label: 'common:routes.datasources',
      children: [
        {
          label: 'common:routes.datasourceSchema',
          path: createPath(pathsConfig.app.datasourceSchema, slug),
          Icon: <Database className={iconClasses} />,
          end: true,
        },
        {
          label: 'common:routes.datasourceTables',
          path: createPath(pathsConfig.app.datasourceTables, slug),
          Icon: <Table className={iconClasses} />,
          end: true,
        },
      ],
    },
    {
      label: 'common:routes.settings',
      children: [
        {
          label: 'common:routes.datasourceSettings',
          path: createPath(pathsConfig.app.datasourceSettings, slug),
          Icon: <Settings className={iconClasses} />,
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

export function createDatasourcePath(slug: string, name: string) {
  return createPath(pathsConfig.app.newProjectDatasource, slug).replace(
    '[name]',
    name,
  );
}

export function createDatasourceViewPath(slug: string) {
  return createPath(pathsConfig.app.projectDatasourceView, slug);
}
