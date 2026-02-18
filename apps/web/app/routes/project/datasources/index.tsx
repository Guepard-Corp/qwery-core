import { Navigate, useParams } from 'react-router';

import { useProject } from '~/lib/context/project-context';
import { useWorkspace } from '~/lib/context/workspace-context';
import { useGetDatasourcesByProjectId } from '~/lib/queries/use-get-datasources';
import pathsConfig, { createPath } from '~/config/paths.config';

import { Skeleton } from '@qwery/ui/skeleton';
import { ListDatasources } from '../_components/list-datasources';

export default function ProjectDatasourcesPage() {
  const { slug } = useParams<{ slug: string }>();
  const { projectId, isLoading: isProjectLoading } = useProject();
  const { repositories } = useWorkspace();
  const datasources = useGetDatasourcesByProjectId(
    repositories.datasource,
    projectId ?? '',
    { enabled: !!projectId },
  );

  const hasDatasources = (datasources.data?.length ?? 0) > 0;

  if (isProjectLoading || (projectId && datasources.isLoading)) {
    return (
      <div className="p-6 lg:p-10">
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (!projectId || !hasDatasources) {
    return (
      <Navigate
        to={createPath(pathsConfig.app.availableSources, slug ?? '')}
        replace
      />
    );
  }

  return (
    <div className="flex h-full flex-col">
      <ListDatasources datasources={datasources.data ?? []} />
    </div>
  );
}
