import { Trans } from '@qwery/ui/trans';

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
    return { organization: null, projects: [] };
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
      return { organization: null, projects: [] };
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

  const pagePadding = 'px-24 py-16 lg:px-32 lg:py-20';

  if (!organization) {
    return (
      <div className="h-full overflow-auto">
        <div className={`h-full ${pagePadding}`}>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-foreground mb-2 text-base font-medium">
              <Trans i18nKey="organizations:organization_not_found" />
            </p>
            <p className="text-muted-foreground text-sm">
              <Trans i18nKey="organizations:organization_not_found_description" />
            </p>
          </div>
        </div>
      </div>
    );
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
