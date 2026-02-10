import { PLAYGROUNDS } from '@qwery/playground/constants';

import type { Route } from './+types/playground';
import { ListPlaygrounds } from './_components/list-playgrounds';

export async function loader() {
  return { playgrounds: PLAYGROUNDS };
}

export default function PlaygroundPage({ loaderData }: Route.ComponentProps) {
  const { playgrounds } = loaderData;

  return (
    <div className="p-2 lg:p-4">
      <ListPlaygrounds playgrounds={playgrounds} />
    </div>
  );
}
