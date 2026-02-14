import type { Organization } from '@qwery/domain/entities';
import { GetOrganizationsService } from '@qwery/domain/services';

import type { Route } from '../../../.react-router/types/app/routes/organizations/+types/index';
import { createRepositories } from '../../../lib/repositories/repositories-factory';

import { ListOrganizations } from './_components/list-organizations';

export async function clientLoader(_args: Route.ClientLoaderArgs) {
  const repositories = await createRepositories();
  const useCase = new GetOrganizationsService(repositories.organization);
  const organizations = await useCase.execute();
  return { organizations: organizations as Organization[] };
}

export default function OrganizationsPage(props: Route.ComponentProps) {
  const { organizations } = props.loaderData;

  return (
    <div className="h-full">
      <ListOrganizations organizations={organizations ?? []} />
    </div>
  );
}
