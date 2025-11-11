import { Skeleton } from '@qwery/ui/skeleton';

import { useWorkspace } from '~/lib/context/workspace-context';
import { getDatasources } from '~/lib/datasources-loader';
import { useGetDatasources } from '~/lib/queries/use-get-datasources';

import { ListDatasources } from '../_components/list-datasources';
import { NewDatasource } from '../_components/new-datasource';
import type { Route } from './+types/index';

export async function loader(_args: Route.LoaderArgs) {
  const pluginDatasources = await getDatasources();
  return { pluginDatasources };
}

export default function ProjectDatasourcesPage({
  loaderData,
}: Route.ComponentProps) {
  const { pluginDatasources } = loaderData;
  const { repositories } = useWorkspace();
  const datasources = useGetDatasources(repositories.datasource);

  const hasDatasources = datasources.data?.length ?? 0 > 0;

  return (
    <div className="p-2 lg:p-4">
      {datasources.isLoading && <Skeleton className="h-10 w-full" />}

      {!datasources.isLoading && !hasDatasources && (
        <NewDatasource datasources={pluginDatasources} />
      )}

      {!datasources.isLoading && hasDatasources && (
        <ListDatasources datasources={datasources.data || []} />
      )}
    </div>
  );
}
