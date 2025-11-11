import { getDatasources } from '~/lib/datasources-loader';

import { NewDatasource } from '../_components/new-datasource';
import type { Route } from './+types/sources';

export async function loader() {
  const pluginDatasources = await getDatasources();
  return { pluginDatasources };
}

export default function ProjectDatasourcesPage({
  loaderData,
}: Route.ComponentProps) {
  const { pluginDatasources } = loaderData;

  return (
    <div className="p-2 lg:p-4">
      <NewDatasource datasources={pluginDatasources} />
    </div>
  );
}
