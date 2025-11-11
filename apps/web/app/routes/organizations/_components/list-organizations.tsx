import { useNavigate } from 'react-router';

import type { Organization } from '@qwery/domain/entities';
import { OrganizationCard } from '@qwery/ui/organization';
import { Trans } from '@qwery/ui/trans';

import pathsConfig, { createPath } from '~/config/paths.config';

export function ListOrganizations({
  organizations,
}: {
  organizations: Organization[];
}) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-6">
      {organizations.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-foreground mb-2 text-base font-medium">
            <Trans i18nKey="organizations:no_organizations" />
          </p>
          <p className="text-muted-foreground text-sm">
            <Trans i18nKey="organizations:no_organizations_description" />
          </p>
        </div>
      )}

      {organizations.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {organizations.map((org) => (
            <OrganizationCard
              key={org.id}
              id={org.id}
              name={org.name}
              onClick={() => {
                const path = createPath(
                  pathsConfig.app.organizationView,
                  org.slug,
                );
                navigate(path);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
