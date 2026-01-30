import { Skeleton } from '@qwery/ui/skeleton';

import { useWorkspace } from '~/lib/context/workspace-context';
import { useGetOrganizations } from '~/lib/queries/use-get-organizations';

import { ListOrganizations } from './_components/list-organizations';

export default function OrganizationsPage() {
  const { repositories } = useWorkspace();
  const organizations = useGetOrganizations(repositories.organization);

  return (
    <div className="h-full">
      {organizations.isLoading && (
        <div className="flex h-full items-center justify-center">
          <Skeleton className="h-10 w-full" />
        </div>
      )}
      {!organizations.isLoading && (
        <ListOrganizations organizations={organizations.data ?? []} />
      )}
    </div>
  );
}
