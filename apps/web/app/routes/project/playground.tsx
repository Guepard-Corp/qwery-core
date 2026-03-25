import { PLAYGROUNDS } from '@qwery/playground/constants';

import type { Route } from './+types/playground';
import { ListPlaygrounds } from './_components/list-playgrounds';
import { pageTitle } from '~/lib/page-title';
import { loadProjectName } from '~/lib/loaders/route-meta-loaders';

export async function clientLoader(args: Route.ClientLoaderArgs) {
  const projectName = await loadProjectName(args.request, args.params.slug);
  return { playgrounds: PLAYGROUNDS, projectName };
}

export const meta = ({ data }: Route.MetaArgs) => [
  {
    title: pageTitle(
      data?.projectName
        ? `Playground · ${data.projectName}`
        : 'Playground',
    ),
  },
];

export default function PlaygroundPage({ loaderData }: Route.ComponentProps) {
  const { playgrounds } = loaderData;

  return (
    <div className="p-2 lg:p-4">
      <ListPlaygrounds playgrounds={playgrounds} />
    </div>
  );
}
