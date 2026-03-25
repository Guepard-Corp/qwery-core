import { GetProjectBySlugService } from '@qwery/domain/services';
import { DomainException } from '@qwery/domain/exceptions';

import type { Route } from '~/types/app/routes/project/+types/index';
import { getRepositoriesForLoader } from '~/lib/loaders/create-repositories';
import { pageTitle } from '~/lib/page-title';

import WelcomePage from './_components/welcome';

export const meta = ({ data }: Route.MetaArgs) => [
  { title: pageTitle(data?.project?.name?.trim() || 'Project') },
];

export async function clientLoader(args: Route.ClientLoaderArgs) {
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
