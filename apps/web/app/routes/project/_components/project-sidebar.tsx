import { useMemo, useCallback } from 'react';
import { PanelRightOpen } from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarTrigger,
  useSidebar,
} from '@qwery/ui/shadcn-sidebar';
import { Button } from '@qwery/ui/button';
import { cn } from '@qwery/ui/utils';
import { SidebarNavigation } from '@qwery/ui/sidebar-navigation';

import { AccountDropdownContainer } from '~/components/account-dropdown-container';
import { AppLogo } from '~/components/app-logo';
import { createNavigationConfig } from '~/config/project.navigation.config';
import { SidebarOrgSelector } from './sidebar-org-selector';
import { useProject } from '~/lib/context/project-context';
import { useWorkspace } from '~/lib/context/workspace-context';
import { WorkspaceModeEnum } from '@qwery/domain/enums';
import { ProjectChatNotebookSidebarContent } from './project-chat-notebook-sidebar-content';

export function ProjectSidebar() {
  const { projectSlug } = useProject();
  const { workspace } = useWorkspace();
  const { toggleSidebar, state } = useSidebar();
  const isCollapsed = state === 'collapsed';
  const isSimpleMode = workspace.mode === WorkspaceModeEnum.SIMPLE;

  const handleExpandClick = useCallback(() => {
    toggleSidebar();
  }, [toggleSidebar]);

  const navigationConfig = useMemo(() => {
    if (!projectSlug) return null;
    const config = createNavigationConfig(projectSlug);
    const first = config.routes[0];
    const hasChildren =
      first && 'children' in first && Array.isArray(first.children);

    if (isSimpleMode && hasChildren && first && 'children' in first) {
      return {
        ...config,
        routes: [
          {
            ...first,
            children: first.children.filter(
              (child) =>
                'path' in child &&
                child.path &&
                !child.path.includes('/datasources') &&
                !child.path.includes('/notebooks'),
            ),
          },
        ],
      };
    }

    return config;
  }, [projectSlug, isSimpleMode]);

  if (!projectSlug || !navigationConfig) {
    return null;
  }

  return (
    <Sidebar
      className={cn(
        'w-[var(--sidebar-width)] max-w-[var(--sidebar-width)] border-r',
        'group-data-[collapsible=icon]:w-[var(--sidebar-width-icon)] group-data-[collapsible=icon]:max-w-[var(--sidebar-width-icon)] group-data-[collapsible=icon]:min-w-0',
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
              'group-data-[collapsible=icon]:hover:bg-sidebar-accent group-data-[collapsible=icon]:absolute group-data-[collapsible=icon]:inset-0 group-data-[collapsible=icon]:z-10 group-data-[collapsible=icon]:!flex group-data-[collapsible=icon]:size-full group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:group-hover/logoarea:opacity-100',
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
            'transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
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
            'overflow-hidden transition-[max-height,opacity] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
            isCollapsed ? 'max-h-0 opacity-0' : 'mt-2 max-h-24 opacity-100',
          )}
        >
          <SidebarOrgSelector />
        </div>
        <SidebarNavigation config={navigationConfig} />
        <ProjectChatNotebookSidebarContent />
      </SidebarContent>
      <SidebarFooter className="p-1.5">
        <AccountDropdownContainer />
      </SidebarFooter>
    </Sidebar>
  );
}
