import { useNavigate, useParams } from 'react-router';

import { NewDatasource } from '@qwery/datasources/new-datasource';
import {
  Sidebar,
  SidebarFooter,
  SidebarHeader,
} from '@qwery/ui/shadcn-sidebar';

import { AccountDropdownContainer } from '~/components/account-dropdown-container';
import pathsConfig from '~/config/paths.config';
import { createPath } from '~/config/qwery.navigation.config';
import { Route } from '~/types/app/routes/layout/+types/layout';

export function LayoutSidebar(
  _props: Route.ComponentProps & React.PropsWithChildren,
) {
  const params = useParams();
  const navigate = useNavigate();
  const project_id = params.slug as string;
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
      <SidebarFooter className="flex justify-center invert-0">
        <AccountDropdownContainer />
      </SidebarFooter>
    </Sidebar>
  );
}
