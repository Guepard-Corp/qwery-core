import { useNavigate, useParams } from 'react-router';

import { NewDatasource } from '@qwery/datasources/new-datasource';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from '@qwery/ui/shadcn-sidebar';
import { SidebarNavigation } from '@qwery/ui/sidebar-navigation';

import { AccountDropdownContainer } from '~/components/account-dropdown-container';
import pathsConfig from '~/config/paths.config';
import { createNavigationConfig } from '~/config/project.navigation.config';
import { createPath } from '~/config/qwery.navigation.config';
import { Shortcuts } from 'node_modules/@qwery/ui/src/qwery/shortcuts';
import { useTelemetry, PROJECT_EVENTS } from '@qwery/telemetry';
import { useWorkspace } from '~/lib/context/workspace-context';
import { useGetNotebooksByProjectId } from '~/lib/queries/use-get-notebook';

export function ProjectSidebar() {
  const navigate = useNavigate();
  const { workspace, repositories } = useWorkspace();
  const telemetry = useTelemetry();
  const params = useParams();
  const slug = params.slug as string;

  const notebookRepository = repositories.notebook;
  const notebooks = useGetNotebooksByProjectId(
    notebookRepository,
    workspace.projectId,
  );

  const navigationConfig = createNavigationConfig(slug, notebooks?.data || []);
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className={'h-16 justify-center'}>
        <div className="flex w-full items-center justify-center">
          <NewDatasource
            onClick={() => {
              telemetry.trackEvent(PROJECT_EVENTS.NEW_DATASOURCE_CLICKED);
              navigate(createPath(pathsConfig.app.availableSources, slug));
            }}
          />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarNavigation config={navigationConfig} />
      </SidebarContent>

      <SidebarFooter>
        <div className="flex flex-col space-y-2 p-4">
          <Shortcuts
            items={[
              {
                text: 'Agent',
                keys: ['⌘', 'L'],
              },
            ]}
          />
        </div>
        <AccountDropdownContainer />
      </SidebarFooter>
    </Sidebar>
  );
}
