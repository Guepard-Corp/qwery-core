import { useMemo } from 'react';
import { useLocation } from 'react-router';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from '@qwery/ui/shadcn-sidebar';
import { SidebarNavigation } from '@qwery/ui/sidebar-navigation';

import { AccountDropdownContainer } from '~/components/account-dropdown-container';
import { createNavigationConfig } from '~/config/project.navigation.config';
import { Shortcuts } from '@qwery/ui/shortcuts';
import { useWorkspace } from '~/lib/context/workspace-context';
import { useGetNotebooksByProjectId } from '~/lib/queries/use-get-notebook';
import { useGetProjectById } from '~/lib/queries/use-get-projects';

export function ProjectSidebar() {
  const { workspace, repositories } = useWorkspace();
  const location = useLocation();
  
  // Get project slug from project data (works for all routes including notebook pages)
  const project = useGetProjectById(
    repositories.project,
    workspace.projectId || '',
  );
  const slug = project.data?.slug;

  // Fallback: Extract project slug from pathname if project data not available
  const projectSlugMatch = location.pathname.match(/^\/prj\/([^/]+)/);
  const slugFromPath = projectSlugMatch?.[1];
  const finalSlug = slug || slugFromPath;

  const notebookRepository = repositories.notebook;
  const notebooks = useGetNotebooksByProjectId(
    notebookRepository,
    workspace.projectId,
  );
  const notebooksList = useMemo(() => notebooks?.data ?? [], [notebooks?.data]);

  const navigationConfig = useMemo(() => {
    if (!finalSlug) return null;
    return createNavigationConfig(finalSlug);
  }, [finalSlug]);

  if (!navigationConfig) {
    return null;
  }

  return (
    <Sidebar collapsible="none">
      <SidebarContent>
        <SidebarNavigation config={navigationConfig} />
      </SidebarContent>

      <SidebarFooter>
        {!location.pathname.startsWith('/notebook/') && (
          <div className="flex flex-col space-y-2 p-4">
            <div
              onClick={() => {
                const isMac =
                  navigator.platform.toUpperCase().indexOf('MAC') >= 0;
                const event = new KeyboardEvent('keydown', {
                  key: 'l',
                  code: 'KeyL',
                  [isMac ? 'metaKey' : 'ctrlKey']: true,
                  bubbles: true,
                  cancelable: true,
                });
                window.dispatchEvent(event);
              }}
              className="cursor-pointer"
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  const isMac =
                    navigator.platform.toUpperCase().indexOf('MAC') >= 0;
                  const keyboardEvent = new KeyboardEvent('keydown', {
                    key: 'l',
                    code: 'KeyL',
                    [isMac ? 'metaKey' : 'ctrlKey']: true,
                    bubbles: true,
                    cancelable: true,
                  });
                  window.dispatchEvent(keyboardEvent);
                }
              }}
            >
              <Shortcuts
                items={[
                  {
                    text: 'Agent',
                    keys: ['⌘', 'L'],
                  },
                ]}
              />
            </div>
          </div>
        )}
        <AccountDropdownContainer />
      </SidebarFooter>
    </Sidebar>
  );
}
