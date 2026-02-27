import { memo, useMemo } from 'react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
} from '@qwery/ui/shadcn-sidebar';
import { SidebarNavigation } from '@qwery/ui/sidebar-navigation';

import { AccountDropdownContainer } from '~/components/account-dropdown-container';
import { createNavigationConfig } from '~/config/project.navigation.config';
import { useProject } from '~/lib/context/project-context';
import { ProjectChatNotebookSidebarContent } from './project-chat-notebook-sidebar-content';

function ProjectSidebarInner() {
  const { projectSlug } = useProject();

  const navigationConfig = useMemo(() => {
    if (!projectSlug) return null;
    return createNavigationConfig(projectSlug);
  }, [projectSlug]);

  if (!projectSlug || !navigationConfig) {
    return null;
  }

  return (
    <Sidebar
      collapsible="none"
      className="w-[18rem] max-w-[18rem] min-w-[18rem] border-r"
    >
      <SidebarContent className="overflow-hidden p-4">
        <SidebarNavigation config={navigationConfig} />
        <ProjectChatNotebookSidebarContent />
      </SidebarContent>

      <SidebarFooter>
        <AccountDropdownContainer />
      </SidebarFooter>
    </Sidebar>
  );
}

export const ProjectSidebar = memo(ProjectSidebarInner);
