import { Skeleton } from '@qwery/ui/skeleton';
import { Trans } from '@qwery/ui/trans';

import { useWorkspace } from '~/lib/context/workspace-context';
import { useGetOrganizations } from '~/lib/queries/use-get-organizations';

import { ListOrganizations } from './_components/list-organizations';

export default function OrganizationsPage() {
  const { repositories } = useWorkspace();
  const organizations = useGetOrganizations(repositories.organization);

  return (
    <div className="mt-16 mr-64 ml-64 p-2 lg:p-4">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-bold">
            <Trans i18nKey="organizations:title" />
          </h1>
        </div>
        {organizations.isLoading && <Skeleton className="h-10 w-full" />}
        {!organizations.isLoading && (
          <ListOrganizations organizations={organizations.data ?? []} />
        )}
      </div>
    </div>
  );
}
