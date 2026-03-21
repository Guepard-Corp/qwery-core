import type { Organization } from '@qwery/domain/entities';
import { GetOrganizationsService } from '@qwery/domain/services';
import { DomainException } from '@qwery/domain/exceptions';

import type { Route } from '../../../.react-router/types/app/routes/organizations/+types/index';
import { createRepositories } from '../../../lib/repositories/repositories-factory';
import { ApiError } from '~/lib/repositories/api-client';

import { ListOrganizations } from './_components/list-organizations';

export async function clientLoader(_args: Route.ClientLoaderArgs) {
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

const PAGE_PADDING =
  'px-10 py-16 sm:px-16 md:px-20 lg:px-44 xl:px-56 2xl:px-64 lg:py-20';

export default function OrganizationsPage(props: Route.ComponentProps) {
  const { organizations } = props.loaderData;

  return (
    <div className="h-full overflow-auto">
      <div className={`h-full ${PAGE_PADDING}`}>
        <ListOrganizations organizations={organizations ?? []} />
      </div>
    </div>
  );
}
