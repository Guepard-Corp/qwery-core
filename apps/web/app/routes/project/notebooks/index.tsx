import { useEffect, useState } from 'react';

import {
  GetNotebooksByProjectIdService,
  GetProjectBySlugService,
} from '@qwery/domain/services';
import { DomainException } from '@qwery/domain/exceptions';

import type { Route } from '~/types/app/routes/project/notebooks/+types/index';
import { getRepositoriesForLoader } from '~/lib/loaders/create-repositories';

import { ListNotebooks } from '../_components/list-notebooks';

export async function clientLoader(args: Route.ClientLoaderArgs) {
  const slug = args.params.slug;
  if (!slug) {
    return { project: null, notebooks: [] };
  }

  const repositories = await getRepositoriesForLoader(args.request);
  const getProjectService = new GetProjectBySlugService(repositories.project);
  const getNotebooksService = new GetNotebooksByProjectIdService(
    repositories.notebook,
  );

  let project: Awaited<ReturnType<GetProjectBySlugService['execute']>> | null =
    null;

  try {
    project = await getProjectService.execute(slug);
  } catch (error) {
    if (error instanceof DomainException) {
      return { project: null, notebooks: [] };
    }
    throw error;
  }

  const notebooks = project
    ? await getNotebooksService.execute(project.id)
    : [];

  return {
    project,
    notebooks,
  };
}

export default function ProjectNotebooksPage(props: Route.ComponentProps) {
  const { notebooks } = props.loaderData;
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
        notebooks={notebooks ?? []}
        unsavedNotebookSlugs={unsavedNotebookSlugs}
      />
    </div>
  );
}
