import { memo } from 'react';
import { useParams } from 'react-router';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
} from '@qwery/ui/shadcn-sidebar';
import { SidebarNavigation } from '@qwery/ui/sidebar-navigation';

import { AccountDropdownContainer } from '~/components/account-dropdown-container';
import { createNavigationConfig } from '~/config/datasource.navigation.config';
import { Shortcuts } from '@qwery/ui/shortcuts';
import { useFocusAgentShortcut } from '~/lib/hooks/use-focus-agent-shortcut';
import { DevProfiler } from '~/lib/perf/dev-profiler';
import { ProjectChatNotebookSidebarContent } from '../../project/_components/project-chat-notebook-sidebar-content';

export const DatasourceSidebar = memo(function DatasourceSidebar() {
  const params = useParams();
  const slug = params.slug as string;
  const focusAgent = useFocusAgentShortcut();

  const navigationConfig = createNavigationConfig(slug);
  return (
    <Sidebar
      collapsible="none"
      className="w-[18rem] max-w-[18rem] min-w-[18rem] border-r"
    >
      <SidebarContent className="overflow-hidden p-4">
        <SidebarNavigation config={navigationConfig} />
        <DevProfiler id="DatasourceSidebar/ChatNotebook">
          <ProjectChatNotebookSidebarContent />
        </DevProfiler>
      </SidebarContent>

      <SidebarFooter>
        <AccountDropdownContainer />
      </SidebarFooter>
    </Sidebar>
  );
});
