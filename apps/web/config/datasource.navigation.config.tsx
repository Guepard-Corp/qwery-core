import React from 'react';

import { Database, Home, Settings, Table } from 'lucide-react';
import { z } from 'zod';

import { NavigationConfigSchema } from '@qwery/ui/navigation-schema';

import pathsConfig from './paths.config';
import { createPath } from './qwery.navigation.config';

const iconClasses = 'w-4';

const getRoutes = (
  slug: string,
  projectSlug?: string,
  onSettingsClick?: () => void,
) =>
  [
    {
      label: 'common:routes.project',
      children: projectSlug
        ? [
            {
              label: 'common:routes.projectDashboard',
              path: createPath(pathsConfig.app.project, projectSlug),
              Icon: <Home className={iconClasses} />,
              end: true,
            },
            {
              label: 'common:routes.datasources',
              path: createPath(pathsConfig.app.projectDatasources, projectSlug),
              Icon: <Database className={iconClasses} />,
              end: true,
            },
          ]
        : [],
    },
    {
      label: 'Datasource',
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
          onClick: onSettingsClick,
        },
      ],
    },
  ] satisfies z.infer<typeof NavigationConfigSchema>['routes'];

export function createNavigationConfig(
  slug: string,
  projectSlug?: string,
  onSettingsClick?: () => void,
) {
  return NavigationConfigSchema.parse({
    routes: getRoutes(slug, projectSlug, onSettingsClick),
  });
}

export function createDatasourcePath(slug: string, _name: string) {
  return createPath(pathsConfig.app.availableSources, slug);
}

export function createDatasourceViewPath(slug: string) {
  return createPath(pathsConfig.app.projectDatasourceView, slug);
}
