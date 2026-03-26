import { memo, useCallback, useMemo, useState } from 'react';
import { useParams } from 'react-router';
import { PanelRightOpen } from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarTrigger,
  useSidebar,
} from '@qwery/ui/shadcn-sidebar';
import { SidebarNavigation } from '@qwery/ui/sidebar-navigation';
import { Button } from '@qwery/ui/button';
import { cn } from '@qwery/ui/utils';

import { AccountDropdownContainer } from '~/components/account-dropdown-container';
import { AppLogo } from '~/components/app-logo';
import { createNavigationConfig } from '~/config/datasource.navigation.config';
import pathsConfig, { createPath } from '~/config/paths.config';
import { useProject } from '~/lib/context/project-context';
import { useWorkspace } from '~/lib/context/workspace-context';
import { useGetDatasourceBySlug } from '~/lib/queries/use-get-datasources';
import { useGetExtension } from '~/lib/queries/use-get-extension';
import { DatasourceConnectSheet } from '../../project/_components/datasource-connect-sheet';
import { SidebarOrgSelector } from '../../project/_components/sidebar-org-selector';

export const DatasourceSidebar = memo(function DatasourceSidebar() {
  const params = useParams();
  const slug = params.slug as string;
  const { toggleSidebar, state } = useSidebar();
  const isCollapsed = state === 'collapsed';
  const { projectSlug } = useProject();
  const { repositories } = useWorkspace();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const datasource = useGetDatasourceBySlug(
    repositories.datasource,
    slug ?? '',
  );
  const extension = useGetExtension(datasource.data?.datasource_provider ?? '');

  const handleOpenSettings = useCallback(() => {
    setIsSettingsOpen(true);
  }, []);

  const navigationConfig = createNavigationConfig(
    slug,
    projectSlug,
    handleOpenSettings,
  );
  const logoHref = projectSlug
    ? createPath(pathsConfig.app.projectDatasources, projectSlug)
    : pathsConfig.app.home;
  const datasourceData = datasource.data;
  const extensionData = extension.data;
  const canRenderSettingsSheet = useMemo(
    () => Boolean(isSettingsOpen && datasourceData && extensionData),
    [isSettingsOpen, datasourceData, extensionData],
  );

  const handleExpandClick = useCallback(() => {
    toggleSidebar();
  }, [toggleSidebar]);

  return (
    <Sidebar
      className={cn(
        'w-(--sidebar-width) max-w-(--sidebar-width) border-r',
        'group-data-[collapsible=icon]:w-(--sidebar-width-icon) group-data-[collapsible=icon]:max-w-(--sidebar-width-icon) group-data-[collapsible=icon]:min-w-0',
      )}
    >
      <SidebarHeader
        className={cn(
          'flex flex-row items-center justify-between gap-2 p-3',
          'group-data-[collapsible=icon]:p-3',
        )}
      >
        <div
          className={cn(
            'group/logoarea flex size-9 shrink-0 items-center justify-center transition-opacity duration-200',
            'group-data-[collapsible=icon]:relative group-data-[collapsible=icon]:cursor-pointer',
          )}
        >
          <AppLogo
            href={logoHref}
            className={cn(
              'h-6 w-6 shrink-0 transition-opacity duration-200',
              'group-data-[collapsible=icon]:relative group-data-[collapsible=icon]:z-0 group-data-[collapsible=icon]:group-hover/logoarea:opacity-0',
            )}
          />
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'hidden h-7 w-7 shrink-0 rounded-md transition-opacity duration-200',
              'group-data-[collapsible=icon]:hover:bg-sidebar-accent group-data-[collapsible=icon]:absolute group-data-[collapsible=icon]:inset-0 group-data-[collapsible=icon]:z-10 group-data-[collapsible=icon]:flex! group-data-[collapsible=icon]:size-full group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:group-hover/logoarea:opacity-100',
            )}
            onClick={handleExpandClick}
            title="Expand sidebar"
            aria-label="Expand sidebar"
          >
            <PanelRightOpen className="size-4" />
          </Button>
        </div>
        <SidebarTrigger
          title="Collapse sidebar"
          className={cn(
            'transition-[opacity,transform] duration-300 ease-in-out',
            isCollapsed
              ? 'pointer-events-none -translate-x-1 opacity-0'
              : 'translate-x-0 opacity-100',
          )}
        />
      </SidebarHeader>
      <SidebarContent
        className={cn(
          'overflow-hidden px-3',
          'group-data-[collapsible=icon]:px-3 group-data-[collapsible=icon]:py-1.5',
        )}
      >
        <div
          className={cn(
            'overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out',
            isCollapsed ? 'max-h-0 opacity-0' : 'mt-2 max-h-24 opacity-100',
          )}
        >
          <SidebarOrgSelector />
        </div>
        <SidebarNavigation config={navigationConfig} />
      </SidebarContent>

      <SidebarFooter className="p-1.5">
        <AccountDropdownContainer />
      </SidebarFooter>

      {canRenderSettingsSheet && datasourceData && extensionData && (
        <DatasourceConnectSheet
          open={isSettingsOpen}
          onOpenChange={setIsSettingsOpen}
          extensionId={datasourceData.datasource_provider}
          projectSlug={projectSlug ?? ''}
          extensionMeta={extensionData}
          existingDatasource={datasourceData}
          initialFormValues={
            datasourceData.config as Record<string, unknown> | undefined
          }
          onSuccess={() => setIsSettingsOpen(false)}
          onCancel={() => setIsSettingsOpen(false)}
        />
      )}
    </Sidebar>
  );
});
