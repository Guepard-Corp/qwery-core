import { useParams } from 'react-router';

import { Trans } from '@qwery/ui/trans';

import { useWorkspace } from '~/lib/context/workspace-context';
import { useGetOrganization } from '~/lib/queries/use-get-organizations';
import { useGetProjects } from '~/lib/queries/use-get-projects';

import { ListProjects } from './_components/list-projects';

export default function OrganizationPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { repositories } = useWorkspace();

  const organization = useGetOrganization(repositories.organization, slug);
  const projects = useGetProjects(
    repositories.project,
    organization.data?.id ?? '',
  );
  const isLoading = organization.isLoading || projects.isLoading;

  if (isLoading) {
    return (
      <div className="p-2 lg:p-4">
        <div className="flex items-center justify-center py-16">
          <p className="text-muted-foreground">
            <Trans i18nKey="organizations:loading" />
          </p>
        </div>
      </div>
    );
  }

  if (!organization.data) {
    return (
      <div className="p-2 lg:p-4">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-foreground mb-2 text-base font-medium">
            <Trans i18nKey="organizations:organization_not_found" />
          </p>
          <p className="text-muted-foreground text-sm">
            <Trans i18nKey="organizations:organization_not_found_description" />
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full">
      <ListProjects
        projects={projects.data ?? []}
        organizationId={organization.data?.id ?? ''}
      />
    </div>
  );
}
