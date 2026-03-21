import {
  GetOrganizationBySlugService,
  GetProjectsByOrganizationIdService,
} from '@qwery/domain/services';
import { DomainException } from '@qwery/domain/exceptions';

import type { Route } from '~/types/app/routes/organization/+types/index';
import { getRepositoriesForLoader } from '~/lib/loaders/create-repositories';

import { ListProjects } from './_components/list-projects';

export async function clientLoader(args: Route.ClientLoaderArgs) {
  const slug = args.params.slug;
  if (!slug) {
    throw new Response('Not Found', { status: 404 });
  }

  const repositories = await getRepositoriesForLoader(args.request);
  const getOrgService = new GetOrganizationBySlugService(
    repositories.organization,
  );
  const getProjectsService = new GetProjectsByOrganizationIdService(
    repositories.project,
  );

  let organization: Awaited<
    ReturnType<GetOrganizationBySlugService['execute']>
  > | null = null;

  try {
    organization = await getOrgService.execute(slug);
  } catch (error) {
    if (error instanceof DomainException) {
      throw new Response('Not Found', { status: 404 });
    }
    throw error;
  }

  const projects = organization
    ? await getProjectsService.execute(organization.id)
    : [];

  return {
    organization,
    projects,
  };
}

export default function OrganizationPage(props: Route.ComponentProps) {
  const { organization, projects } = props.loaderData;

  const pagePadding =
    'px-10 py-16 sm:px-16 md:px-20 lg:px-44 xl:px-56 2xl:px-64 lg:py-20';

  if (!organization) {
    throw new Response('Not Found', { status: 404 });
  }

  return (
    <div className="h-full overflow-auto">
      <div className={`h-full ${pagePadding}`}>
        <ListProjects
          projects={projects ?? []}
          organizationId={organization.id}
        />
      </div>
    </div>
  );
}
