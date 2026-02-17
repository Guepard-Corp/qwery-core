import type { Organization } from '@qwery/domain/entities';
import { GetOrganizationsService } from '@qwery/domain/services';
import { DomainException } from '@qwery/domain/exceptions';

import type { Route } from '~/types/app/routes/organizations/+types/index';
import { createRepositories } from '~/lib/repositories/repositories-factory';
import { ApiError } from '~/lib/repositories/api-client';

import { ListOrganizations } from './_components/list-organizations';

export async function loader(_args: Route.LoaderArgs) {
  try {
    const repositories = await createRepositories();
    const useCase = new GetOrganizationsService(repositories.organization);
    const organizations = await useCase.execute();
    return { organizations: organizations as Organization[] };
  } catch (error) {
    if (error instanceof DomainException) {
      return { organizations: [] };
    }
    if (error instanceof ApiError) {
      return { organizations: [] };
    }
    throw error;
  }
}

export default function OrganizationsPage(props: Route.ComponentProps) {
  const { organizations } = props.loaderData;

  return (
    <div className="h-full">
      <ListOrganizations organizations={organizations ?? []} />
    </div>
  );
}
