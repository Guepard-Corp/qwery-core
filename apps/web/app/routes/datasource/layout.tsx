import { Outlet } from 'react-router';

import {
  Page,
  PageFooter,
  PageMobileNavigation,
  PageNavigation,
  PageTopNavigation,
} from '@qwery/ui/page';
import { SidebarProvider } from '@qwery/ui/shadcn-sidebar';
import type { Route } from '~/types/app/routes/project/+types/layout';

import { LayoutFooter } from '../layout/_components/layout-footer';
import { LayoutMobileNavigation } from '../layout/_components/layout-mobile-navigation';
import { ProjectLayoutTopBar } from '../project/_components/project-topbar';
import { DatasourceSidebar } from './_components/datasource-sidebar';
import { useWorkspace } from '~/lib/context/workspace-context';
import { WorkspaceModeEnum } from '@qwery/domain/enums';
import { ProjectProvider } from '~/lib/context/project-context';

export async function loader(_args: Route.LoaderArgs) {
  return {
    layoutState: {
      open: true,
    },
  };
}

function SidebarLayout(props: Route.ComponentProps & React.PropsWithChildren) {
  const { layoutState } = props.loaderData;

  return (
    <ProjectProvider>
      <SidebarProvider defaultOpen={layoutState.open}>
        <Page>
          <PageTopNavigation>
            <ProjectLayoutTopBar />
          </PageTopNavigation>
          <PageNavigation>
            <DatasourceSidebar />
          </PageNavigation>
          <PageMobileNavigation className={'flex items-center justify-between'}>
            <LayoutMobileNavigation />
          </PageMobileNavigation>
          <PageFooter>
            <LayoutFooter />
          </PageFooter>
          {props.children}
        </Page>
      </SidebarProvider>
    </ProjectProvider>
  );
}

function SimpleModeSidebarLayout(
  props: Route.ComponentProps & React.PropsWithChildren,
) {
  return (
    <ProjectProvider>
      <Page>
        <PageTopNavigation>
          <ProjectLayoutTopBar />
        </PageTopNavigation>
        <PageMobileNavigation className={'flex items-center justify-between'}>
          <LayoutMobileNavigation />
        </PageMobileNavigation>
        <PageFooter>
          <LayoutFooter />
        </PageFooter>
        {props.children}
      </Page>
    </ProjectProvider>
  );
}

export default function Layout(props: Route.ComponentProps) {
  const { workspace } = useWorkspace();
  const SideBar =
    workspace.mode === WorkspaceModeEnum.SIMPLE
      ? SimpleModeSidebarLayout
      : SidebarLayout;
  return (
    <SideBar {...props}>
      <Outlet />
    </SideBar>
  );
}
