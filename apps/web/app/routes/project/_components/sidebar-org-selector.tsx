'use client';

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Building2, ChevronsUpDown, Plus } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@qwery/ui/dropdown-menu';
import { Skeleton } from '@qwery/ui/skeleton';
import { cn, truncateText } from '@qwery/ui/utils';

import { useWorkspace } from '~/lib/context/workspace-context';
import { useProject } from '~/lib/context/project-context';
import { useGetOrganizations } from '~/lib/queries/use-get-organizations';
import pathsConfig, { createPath } from '~/config/paths.config';
import { OrganizationDialog } from '../../organizations/_components/organization-dialog';

export function SidebarOrgSelector() {
  const { t } = useTranslation('common');
  const { repositories } = useWorkspace();
  const { organizationId } = useProject();
  const navigate = useNavigate();
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const organizations = useGetOrganizations(repositories.organization);
  const currentOrg = useMemo(() => {
    if (!organizationId || !organizations.data) return null;
    return organizations.data.find((o) => o.id === organizationId) ?? null;
  }, [organizationId, organizations.data]);

  const handleSelect = (slug: string) => {
    navigate(createPath(pathsConfig.app.organizationView, slug));
  };

  const handleViewAll = () => {
    navigate(pathsConfig.app.organizations);
  };

  const handleDialogSuccess = async () => {
    await organizations.refetch();
    const data = organizations.data;
    if (data?.length) {
      const latest = data[data.length - 1];
      if (latest) handleSelect(latest.slug);
    }
  };

  if (!currentOrg && !organizations.isLoading) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowCreateDialog(true)}
          aria-label={t('sidebar.createOrganization')}
          data-test="org-empty-state-create"
          className={cn(
            'flex w-full cursor-pointer items-center gap-3 rounded-md p-2 transition-colors',
            'hover:bg-sidebar-accent active:bg-sidebar-accent/80',
            'group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-1.5 group-data-[collapsible=icon]:px-0',
          )}
        >
          <div
            className={cn(
              'bg-sidebar-accent/50 relative flex size-8 shrink-0 items-center justify-center rounded-md border',
              'group-data-[collapsible=icon]:size-7',
            )}
          >
            <Building2 className="text-sidebar-foreground/80 size-4 transition-opacity duration-300 ease-in-out group-data-[collapsible=icon]:pointer-events-none group-data-[collapsible=icon]:opacity-0" />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <Plus className="text-sidebar-foreground/80 size-4 opacity-0 transition-opacity duration-300 ease-in-out group-data-[collapsible=icon]:opacity-100" />
            </div>
          </div>
          <div
            className={cn(
              'flex min-w-0 flex-1 flex-col truncate text-left',
              'transition-opacity duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
              'group-data-[collapsible=icon]:pointer-events-none group-data-[collapsible=icon]:opacity-0',
            )}
          >
            <span className="text-muted-foreground truncate text-sm font-medium">
              {t('sidebar.noOrganization')}
            </span>
            <span className="text-muted-foreground truncate text-xs">
              {t('sidebar.createOrganization')}
            </span>
          </div>
        </button>
        <OrganizationDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          organization={null}
          onSuccess={handleDialogSuccess}
        />
      </>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={t('sidebar.organization')}
          data-test="org-dropdown-trigger"
          className={cn(
            'flex w-full cursor-pointer items-center gap-3 rounded-md p-2 transition-colors',
            'hover:bg-sidebar-accent active:bg-sidebar-accent/80',
            'group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-1.5 group-data-[collapsible=icon]:px-0',
          )}
        >
          <div
            className={cn(
              'bg-sidebar-accent/50 flex size-8 shrink-0 items-center justify-center rounded-md border',
              'group-data-[collapsible=icon]:size-7',
            )}
          >
            <Building2 className="text-sidebar-foreground/80 size-4 group-data-[collapsible=icon]:size-3.5" />
          </div>
          {organizations.isLoading ? (
            <Skeleton className="h-5 w-24 flex-1 transition-opacity duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] group-data-[collapsible=icon]:opacity-0" />
          ) : (
            <div
              className={cn(
                'flex min-w-0 flex-1 flex-col truncate text-left',
                'transition-opacity duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
                'group-data-[collapsible=icon]:pointer-events-none group-data-[collapsible=icon]:opacity-0',
              )}
            >
              <span
                className="truncate text-sm font-medium"
                title={currentOrg?.name ?? currentOrg?.slug}
              >
                {truncateText(currentOrg?.name ?? currentOrg?.slug ?? '', 28)}
              </span>
              <span className="text-muted-foreground truncate text-xs">
                {t('sidebar.organization')}
              </span>
            </div>
          )}
          <ChevronsUpDown
            className={cn(
              'text-muted-foreground size-4 shrink-0',
              'transition-opacity duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
              'group-data-[collapsible=icon]:pointer-events-none group-data-[collapsible=icon]:opacity-0',
            )}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="xl:!min-w-[15rem]">
          <DropdownMenuItem className="!h-10 cursor-default rounded-none">
            <div className="flex flex-col justify-start truncate text-left text-xs">
              <div className="text-muted-foreground">
                {t('sidebar.organization')}
              </div>
              <div>
                <span
                  className="block truncate"
                  title={currentOrg?.name ?? currentOrg?.slug ?? undefined}
                >
                  {truncateText(
                    currentOrg?.name ??
                      currentOrg?.slug ??
                      t('breadcrumb.loading'),
                    28,
                  )}
                </span>
              </div>
            </div>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {(organizations.data ?? []).map((org) => {
            const isCurrent = org.id === currentOrg?.id;
            return (
              <DropdownMenuItem
                key={org.id}
                className={cn(
                  'flex cursor-pointer items-center gap-2',
                  isCurrent && 'bg-accent',
                )}
                onClick={() => handleSelect(org.slug)}
              >
                <Building2 className="text-muted-foreground size-4 shrink-0" />
                <span className="min-w-0 truncate" title={org.name ?? org.slug}>
                  {truncateText(org.name ?? org.slug, 28)}
                </span>
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="flex cursor-pointer items-center gap-2"
            onClick={handleViewAll}
          >
            <Building2 className="text-muted-foreground size-4 shrink-0" />
            <span>{t('breadcrumb.viewAllOrgs')}</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="flex cursor-pointer items-center gap-2"
            onClick={() => setShowCreateDialog(true)}
          >
            <Plus className="text-muted-foreground size-4 shrink-0" />
            <span>{t('breadcrumb.newOrg')}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <OrganizationDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        organization={null}
        onSuccess={handleDialogSuccess}
      />
    </>
  );
}
