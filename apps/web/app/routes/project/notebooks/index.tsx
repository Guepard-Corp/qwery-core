import { Skeleton } from '@qwery/ui/skeleton';
import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router';

import { useWorkspace } from '~/lib/context/workspace-context';
import { useGetNotebooksByProjectId } from '~/lib/queries/use-get-notebook';
import { useGetProjectBySlug } from '~/lib/queries/use-get-projects';

import { ListNotebooks } from '../_components/list-notebooks';

export default function ProjectNotebooksPage() {
  const { repositories, workspace } = useWorkspace();
  const params = useParams();
  const projectSlug = params.slug;

  // Get project by slug to ensure we have the correct projectId
  const projectBySlug = useGetProjectBySlug(
    repositories.project,
    projectSlug || '',
  );

  // Use projectId from the fetched project, fallback to workspace.projectId
  const projectId = useMemo(() => {
    return projectBySlug.data?.id || workspace.projectId;
  }, [projectBySlug.data?.id, workspace.projectId]);

  const notebooks = useGetNotebooksByProjectId(
    repositories.notebook,
    projectId as string,
    {
      enabled: !!projectId,
    },
  );

  const [unsavedNotebookSlugs, setUnsavedNotebookSlugs] = useState<string[]>(
    [],
  );

  useEffect(() => {
    const updateUnsavedSlugs = () => {
      try {
        const unsaved = JSON.parse(
          localStorage.getItem('notebook:unsaved') || '[]',
        ) as string[];
        setUnsavedNotebookSlugs(unsaved);
      } catch {
        setUnsavedNotebookSlugs([]);
      }
    };

    updateUnsavedSlugs();

    window.addEventListener('storage', updateUnsavedSlugs);

    const handleCustomStorage = () => {
      updateUnsavedSlugs();
    };
    window.addEventListener('notebook:unsaved-changed', handleCustomStorage);

    const interval = setInterval(updateUnsavedSlugs, 500);

    return () => {
      window.removeEventListener('storage', updateUnsavedSlugs);
      window.removeEventListener(
        'notebook:unsaved-changed',
        handleCustomStorage,
      );
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="flex h-full flex-col">
      {notebooks.isLoading && (
        <div className="p-6 lg:p-10">
          <Skeleton className="h-10 w-full" />
        </div>
      )}

      {!notebooks.isLoading && (
        <ListNotebooks
          notebooks={notebooks.data || []}
          unsavedNotebookSlugs={unsavedNotebookSlugs}
        />
      )}
    </div>
  );
}
