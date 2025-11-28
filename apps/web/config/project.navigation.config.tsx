import type { ReactNode } from 'react';

import { Database, Home, MoreHorizontal, Notebook, Trash2 } from 'lucide-react';
import { z } from 'zod';

import { NavigationConfigSchema } from '@qwery/ui/navigation-schema';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@qwery/ui/dropdown-menu';
import { Button } from '@qwery/ui/button';

import pathsConfig from './paths.config';
import { createPath } from './qwery.navigation.config';
import type { NotebookOutput } from '@qwery/domain/usecases';

const iconClasses = 'w-4';
const MAX_NOTEBOOK_NAME_LENGTH = 15;

const truncateNotebookName = (name: string, maxLength: number): string => {
  if (name.length <= maxLength) {
    return name;
  }
  return `${name.slice(0, maxLength)}...`;
};

const getNotebookRoutes = (
  notebooks: NotebookOutput[],
  onDeleteNotebook?: (notebook: NotebookOutput) => void,
) => {
  return notebooks.map((notebook) => {
    const deleteAction = onDeleteNotebook ? (
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            aria-label="Notebook options"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteNotebook(notebook);
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ) : undefined;

    const fullTitle = notebook.title || 'Untitled notebook';
    const truncatedTitle = truncateNotebookName(
      fullTitle,
      MAX_NOTEBOOK_NAME_LENGTH,
    );

    return {
      label: truncatedTitle,
      path: createPath(pathsConfig.app.projectNotebook, notebook.slug),
      Icon: <Notebook className={iconClasses} />,
      renderAction: deleteAction,
      title: fullTitle, // Store full title for tooltip
    };
  });
};

const getRoutes = (
  slug: string,
  notebooks: NotebookOutput[],
  onDeleteNotebook?: (notebook: NotebookOutput) => void,
  notebookGroupAction?: ReactNode,
) =>
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
          labelSuffix: `(${notebooks.length})`,
          Icon: <Notebook className={iconClasses} />,
          collapsible: true,
          collapsed: true,
          renderAction: notebookGroupAction,
          children: getNotebookRoutes(notebooks, onDeleteNotebook),
        },
      ],
    },
  ] satisfies z.infer<typeof NavigationConfigSchema>['routes'];

export function createNavigationConfig(
  slug: string,
  notebooks: NotebookOutput[] | undefined,
  onDeleteNotebook?: (notebook: NotebookOutput) => void,
  notebookGroupAction?: ReactNode,
) {
  return NavigationConfigSchema.parse({
    routes: getRoutes(
      slug,
      notebooks || [],
      onDeleteNotebook,
      notebookGroupAction,
    ),
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
