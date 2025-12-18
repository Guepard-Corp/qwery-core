import { Skeleton } from '@qwery/ui/skeleton';

import { useWorkspace } from '~/lib/context/workspace-context';
import { useGetDatasourcesByProjectId } from '~/lib/queries/use-get-datasources';

import { ListDatasources } from '../_components/list-datasources';
import pathsConfig, { createPath } from '~/config/paths.config';
import { Navigate, useParams } from 'react-router';

export default function ProjectDatasourcesPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { repositories, workspace } = useWorkspace();
  const datasources = useGetDatasourcesByProjectId(
    repositories.datasource,
    workspace.projectId as string,
  );

  const hasDatasources = datasources.data?.length ?? 0 > 0;

  if (!datasources.isLoading && !hasDatasources) {
    return <Navigate to={createPath(pathsConfig.app.availableSources, slug)} />;
  }

  return (
    <div className="flex h-full flex-col">
      {datasources.isLoading && (
        <div className="p-6 lg:p-10">
          <Skeleton className="h-10 w-full" />
        </div>
      )}

      {!datasources.isLoading && hasDatasources && (
        <ListDatasources datasources={datasources.data || []} />
      )}
    </div>
  );
}
