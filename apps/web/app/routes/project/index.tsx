import { GetProjectBySlugService } from '@qwery/domain/services';
import { DomainException } from '@qwery/domain/exceptions';

import type { Route } from '~/types/app/routes/project/+types/index';
import { getRepositoriesForLoader } from '~/lib/loaders/create-repositories';

import WelcomePage from './_components/welcome';

export async function clientLoader(args: Route.ClientLoaderArgs) {
  const slug = args.params.slug as string;
  if (!slug) {
    return { project: null };
  }

  const repositories = await getRepositoriesForLoader(args.request);
  const getProjectService = new GetProjectBySlugService(repositories.project);

  try {
    const project = await getProjectService.execute(slug);
    return { project };
  } catch (error) {
    if (error instanceof DomainException) {
      return { project: null };
    }
    throw error;
  }
}

export default function ProjectIndexPage(props: Route.ComponentProps) {
  const { project } = props.loaderData;
  return <WelcomePage project={project} />;
}
