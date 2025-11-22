import { Database, Home, Notebook } from 'lucide-react';
import { z } from 'zod';

import { NavigationConfigSchema } from '@qwery/ui/navigation-schema';

import pathsConfig from './paths.config';
import { createPath } from './qwery.navigation.config';
import type { NotebookOutput } from '@qwery/domain/usecases';

const iconClasses = 'w-4';

const getNotebookRoutes = (notebooks: NotebookOutput[]) => {
  return notebooks.map((notebook) => {
    return {
      label: notebook.title,
      path: createPath(pathsConfig.app.projectNotebook, notebook.slug),
      Icon: <Notebook className={iconClasses} />,
    };
  });
};

const getRoutes = (slug: string, notebooks: NotebookOutput[]) =>
  [
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
          Icon: <Notebook className={iconClasses} />,
          collapsible: true,
          collapsed: true,
          children: getNotebookRoutes(notebooks),
        },
      ],
    },
  ] satisfies z.infer<typeof NavigationConfigSchema>['routes'];

export function createNavigationConfig(
  slug: string,
  notebooks: NotebookOutput[] | undefined,
) {
  return NavigationConfigSchema.parse({
    routes: getRoutes(slug, notebooks || []),
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
