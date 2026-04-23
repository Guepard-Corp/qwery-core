import { Outlet } from 'react-router';

import { Page, PageFooter, PageNavigation } from '@qwery/ui/page';
import { SidebarProvider } from '@qwery/ui/shadcn-sidebar';
import type { Route } from '~/types/app/routes/datasource/+types/layout';

import { LayoutFooter } from '../layout/_components/layout-footer';
import { DatasourceSidebar } from './_components/datasource-sidebar';
import { useWorkspace } from '~/lib/context/workspace-context';
import { WorkspaceModeEnum } from '@qwery/domain/enums';
import { ProjectProvider } from '~/lib/context/project-context';
import { ProjectBreadcrumb } from '../project/_components/project-breadcrumb';

export async function clientLoader(_args: Route.ClientLoaderArgs) {
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
          <PageNavigation>
            <DatasourceSidebar />
          </PageNavigation>
          <PageFooter>
            <LayoutFooter />
          </PageFooter>
          <div className="flex h-full flex-col">
            <div className="bg-background w-fit px-6 pt-4 pb-3 lg:px-16 lg:pt-6">
              <ProjectBreadcrumb />
            </div>
            <div className="flex-1 overflow-hidden">{props.children}</div>
          </div>
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
        <PageFooter>
          <LayoutFooter />
        </PageFooter>
        <div className="flex h-full flex-col">
          <div className="bg-background w-fit px-6 pt-4 pb-3 lg:px-16 lg:pt-6">
            <ProjectBreadcrumb />
          </div>
          <div className="flex-1 overflow-hidden">{props.children}</div>
        </div>
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
