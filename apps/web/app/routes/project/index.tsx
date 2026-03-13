import { GetProjectBySlugService } from '@qwery/domain/services';
import { DomainException } from '@qwery/domain/exceptions';

import type { Route } from '~/types/app/routes/project/+types/index';
import { getRepositoriesForLoader } from '~/lib/loaders/create-repositories';

import WelcomePage from './_components/welcome';

export async function loader(args: Route.LoaderArgs) {
  const slug = args.params.slug as string;
  if (!slug) {
    throw new Response('Not Found', { status: 404 });
  }

  const repositories = await getRepositoriesForLoader(args.request);
  const getProjectService = new GetProjectBySlugService(repositories.project);

  try {
    const project = await getProjectService.execute(slug);
    return { project };
  } catch (error) {
    if (error instanceof DomainException) {
      throw new Response('Not Found', { status: 404 });
    }
    throw error;
  }
}

export default function ProjectIndexPage() {
  return <WelcomePage />;
}
