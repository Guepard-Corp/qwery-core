import { Skeleton } from '@qwery/ui/skeleton';

import { useWorkspace } from '~/lib/context/workspace-context';
import { useGetNotebooksByProjectId } from '~/lib/queries/use-get-notebook';

import { ListNotebooks } from '../_components/list-notebooks';
import { useEffect, useState } from 'react';

export default function ProjectNotebooksPage() {
  const { repositories, workspace } = useWorkspace();
  const notebooks = useGetNotebooksByProjectId(
    repositories.notebook,
    workspace.projectId as string,
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
      window.removeEventListener('notebook:unsaved-changed', handleCustomStorage);
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

