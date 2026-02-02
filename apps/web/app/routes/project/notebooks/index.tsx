import { useEffect, useState } from 'react';

import { useProject } from '~/lib/context/project-context';
import { useWorkspace } from '~/lib/context/workspace-context';
import { useGetNotebooksByProjectId } from '~/lib/queries/use-get-notebook';

import { ListNotebooks } from '../_components/list-notebooks';

export default function ProjectNotebooksPage() {
  const { repositories } = useWorkspace();
  const { projectId } = useProject();

  const notebooks = useGetNotebooksByProjectId(
    repositories.notebook,
    projectId ?? '',
    { enabled: !!projectId },
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
      <ListNotebooks
        notebooks={notebooks.data ?? []}
        unsavedNotebookSlugs={unsavedNotebookSlugs}
      />
    </div>
  );
}
