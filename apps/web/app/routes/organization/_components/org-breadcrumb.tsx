'use client';

import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import type { Organization } from '@qwery/domain/entities';
import {
  QweryBreadcrumb,
  type BreadcrumbNodeItem,
} from '@qwery/ui/qwery-breadcrumb';

import { useWorkspace } from '~/lib/context/workspace-context';
import { useGetOrganizations } from '~/lib/queries/use-get-organizations';
import pathsConfig, { createPath } from '~/config/paths.config';
import { OrganizationDialog } from '../../organizations/_components/organization-dialog';

function toBreadcrumbNodeItem(org: Organization): BreadcrumbNodeItem {
  return {
    id: org.id,
    slug: org.slug,
    name: org.name || '',
  };
}

export function OrgBreadcrumb() {
  const { repositories } = useWorkspace();
  const navigate = useNavigate();
  const params = useParams();
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const organizations = useGetOrganizations(repositories.organization);
  const slug = params.slug as string;

  const currentOrg = useMemo(() => {
    if (!slug || !organizations.data) return null;
    const org = organizations.data.find((org) => org.slug === slug);
    return org ? toBreadcrumbNodeItem(org) : null;
  }, [slug, organizations.data]);

  if (!currentOrg) return null;

  const handleOrgSelect = (org: BreadcrumbNodeItem) => {
    navigate(createPath(pathsConfig.app.organizationView, org.slug));
  };

  const handleNewOrg = () => {
    setShowCreateDialog(true);
  };

  const handleDialogSuccess = async () => {
    await organizations.refetch();
    // Find the newly created org (last one in the list) and navigate to it
    if (organizations.data && organizations.data.length > 0) {
      const latestOrg = organizations.data[organizations.data.length - 1];
      if (latestOrg) {
        handleOrgSelect(toBreadcrumbNodeItem(latestOrg));
      }
    }
  };

  return (
    <>
      <QweryBreadcrumb
        organization={{
          items: (organizations.data || []).map(toBreadcrumbNodeItem),
          isLoading: organizations.isLoading,
          current: currentOrg,
        }}
        paths={{ viewAllOrgs: pathsConfig.app.organizations }}
        onOrganizationSelect={handleOrgSelect}
        onViewAllOrgs={() => navigate(pathsConfig.app.organizations)}
        onNewOrg={handleNewOrg}
      />
      <OrganizationDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        organization={null}
        onSuccess={handleDialogSuccess}
      />
    </>
  );
}
