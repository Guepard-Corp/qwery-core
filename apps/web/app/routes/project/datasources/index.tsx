import { redirect } from 'react-router';

import {
  GetDatasourcesByProjectIdService,
  GetProjectBySlugService,
} from '@qwery/domain/services';
import { DomainException } from '@qwery/domain/exceptions';

import type { Route } from '~/types/app/routes/project/datasources/+types/index';
import { getRepositoriesForLoader } from '~/lib/loaders/create-repositories';
import pathsConfig, { createPath } from '~/config/paths.config';

import { ListDatasources } from '../_components/list-datasources';

export async function loader({ params }: Route.LoaderArgs) {
  const slug = params.slug as string;
  if (!slug) {
    return { project: null, datasources: [] };
  }

  const repositories = await getRepositoriesForLoader();
  const getProjectService = new GetProjectBySlugService(repositories.project);
  const getDatasourcesService = new GetDatasourcesByProjectIdService(
    repositories.datasource,
  );

  let project: Awaited<ReturnType<GetProjectBySlugService['execute']>> | null =
    null;

  try {
    project = await getProjectService.execute(slug);
  } catch (error) {
    if (error instanceof DomainException) {
      return { project: null, datasources: [] };
    }
    throw error;
  }

  const datasources = project
    ? await getDatasourcesService.execute(project.id)
    : [];

  const hasDatasources = (datasources?.length ?? 0) > 0;
  if (!hasDatasources) {
    throw redirect(createPath(pathsConfig.app.availableSources, slug));
  }

  return {
    project,
    datasources,
  };
}

export default function ProjectDatasourcesPage(props: Route.ComponentProps) {
  const { datasources } = props.loaderData;

  return (
    <div className="flex h-full flex-col">
      <ListDatasources datasources={datasources ?? []} />
    </div>
  );
}
