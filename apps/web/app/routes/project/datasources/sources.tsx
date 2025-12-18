import { DATASOURCES } from '~/lib/datasources-loader';

import { NewDatasource } from '../_components/new-datasource';
import type { Route } from './+types/sources';

export async function loader() {
  return { pluginDatasources: DATASOURCES };
}

export default function ProjectDatasourcesPage({
  loaderData,
}: Route.ComponentProps) {
  const { pluginDatasources } = loaderData;

  return (
    <div className="p-6 lg:p-10">
      <NewDatasource datasources={pluginDatasources} />
    </div>
  );
}
