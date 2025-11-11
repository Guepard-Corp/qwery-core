import { useNavigate, useParams } from 'react-router';

import { NewDatasource } from '@qwery/datasources/new-datasource';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarNavigation,
} from '@qwery/ui/shadcn-sidebar';

import { AccountDropdownContainer } from '~/components/account-dropdown-container';
import pathsConfig from '~/config/paths.config';
import { createNavigationConfig } from '~/config/project.navigation.config';
import { createPath } from '~/config/qwery.navigation.config';

export function ProjectSidebar() {
  const navigate = useNavigate();
  const params = useParams();
  const project_id = params.slug as string;
  const navigationConfig = createNavigationConfig(project_id);
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className={'h-16 justify-center'}>
        <div className="flex w-full items-center justify-center">
          <NewDatasource
            onClick={() => {
              navigate(
                createPath(pathsConfig.app.availableSources, project_id),
              );
            }}
          />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarNavigation config={navigationConfig} />
      </SidebarContent>

      <SidebarFooter>
        <AccountDropdownContainer />
      </SidebarFooter>
    </Sidebar>
  );
}
