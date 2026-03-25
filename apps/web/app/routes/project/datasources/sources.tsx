import { DATASOURCES } from '~/lib/loaders/datasource-loader';

import { NewDatasource } from '../_components/new-datasource';
import type { Route } from './+types/sources';
import { pageTitle } from '~/lib/page-title';
import { loadProjectName } from '~/lib/loaders/route-meta-loaders';

export async function clientLoader(args: Route.ClientLoaderArgs) {
  const projectName = await loadProjectName(args.request, args.params.slug);
  return { pluginDatasources: DATASOURCES, projectName };
}

export const meta = ({ data }: Route.MetaArgs) => [
  {
    title: pageTitle(
      data?.projectName
        ? `Connect datasource · ${data.projectName}`
        : 'Connect datasource',
    ),
  },
];

export default function ProjectDatasourcesPage({
  loaderData,
}: Route.ComponentProps) {
  const { pluginDatasources } = loaderData;

  return (
    <div className="bg-background flex h-full flex-col">
      <NewDatasource datasources={pluginDatasources} />
    </div>
  );
}
