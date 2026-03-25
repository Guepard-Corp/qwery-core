import { useEffect, useState } from 'react';

import { Skeleton } from '@qwery/ui/skeleton';
import { useProject } from '~/lib/context/project-context';
import { useWorkspace } from '~/lib/context/workspace-context';
import { useGetNotebooksByProjectId } from '~/lib/queries/use-get-notebook';
import type { Route } from './+types/index';
import { pageTitle } from '~/lib/page-title';
import { loadProjectName } from '~/lib/loaders/route-meta-loaders';

import { ListNotebooks } from '../_components/list-notebooks';

export async function clientLoader(args: Route.ClientLoaderArgs) {
  const projectName = await loadProjectName(args.request, args.params.slug);
  return { projectName };
}

export const meta = ({ data }: Route.MetaArgs) => [
  {
    title: pageTitle(
      data?.projectName ? `Notebooks · ${data.projectName}` : 'Notebooks',
    ),
  },
];

export default function ProjectNotebooksPage() {
  const { repositories } = useWorkspace();
  const { projectId } = useProject();

  const notebooks = useGetNotebooksByProjectId(
    repositories.notebook,
    projectId ?? '',
    { enabled: !!projectId },
  );

  const [unsavedNotebookIds, setUnsavedNotebookIds] = useState<string[]>([]);

  useEffect(() => {
    const updateUnsavedIds = () => {
      try {
        const unsaved = JSON.parse(
          localStorage.getItem('notebook:unsaved') || '[]',
        ) as string[];
        setUnsavedNotebookIds(unsaved);
      } catch {
        setUnsavedNotebookIds([]);
      }
    };

    updateUnsavedIds();
    window.addEventListener('storage', updateUnsavedIds);
    window.addEventListener('notebook:unsaved-changed', updateUnsavedIds);
    return () => {
      window.removeEventListener('storage', updateUnsavedIds);
      window.removeEventListener('notebook:unsaved-changed', updateUnsavedIds);
    };
  }, []);

  return (
    <div className="flex h-full flex-col">
      {notebooks.isLoading && (
        <div className="shrink-0">
          <Skeleton className="h-10 w-full" />
        </div>
      )}

      {!notebooks.isLoading && (
        <ListNotebooks
          notebooks={notebooks.data ?? []}
          unsavedNotebookIds={unsavedNotebookIds}
        />
      )}
    </div>
  );
}
