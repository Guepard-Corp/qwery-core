import { Outlet } from 'react-router';

import {
  Page,
  PageFooter,
  PageMobileNavigation,
  PageNavigation,
  PageTopNavigation,
  AgentSidebar,
} from '@qwery/ui/page';
import { SidebarProvider } from '@qwery/ui/shadcn-sidebar';
import type { Route } from '~/types/app/routes/project/+types/layout';

import { LayoutFooter } from '../layout/_components/layout-footer';
import { LayoutMobileNavigation } from '../layout/_components/layout-mobile-navigation';
import { ProjectLayoutTopBar } from './_components/project-topbar';
import { ProjectSidebar } from './_components/project-sidebar';
import { AgentUIWrapper } from './_components/agent-ui-wrapper';
import { useWorkspace } from '~/lib/context/workspace-context';
import { WorkspaceModeEnum } from '@qwery/domain/enums';
import { AgentTabs, AgentStatusProvider } from '@qwery/ui/ai';

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
    <AgentStatusProvider>
      <SidebarProvider defaultOpen={layoutState.open}>
        <Page>
          <PageTopNavigation>
            <ProjectLayoutTopBar />
          </PageTopNavigation>
          <PageNavigation>
            <ProjectSidebar />
          </PageNavigation>
          <PageMobileNavigation className={'flex items-center justify-between'}>
            <LayoutMobileNavigation />
          </PageMobileNavigation>
          <PageFooter>
            <LayoutFooter />
          </PageFooter>
          <AgentSidebar>
            <AgentUIWrapper conversationSlug="default" />
          </AgentSidebar>
          {props.children}
        </Page>
      </SidebarProvider>
    </AgentStatusProvider>
  );
}

function SimpleModeSidebarLayout(
  props: Route.ComponentProps & React.PropsWithChildren,
) {
  return (
    <AgentStatusProvider>
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
        <AgentSidebar>
          <AgentTabs
            tabs={[
              {
                id: 'query-sql-results',
                title: 'Results',
                description: 'Query SQL Results',
                component: <div>Query SQL Results</div>,
              },
              {
                id: 'query-sql-visualisation',
                title: 'Visualisation',
                description: 'Visualisation of the query SQL results',
                component: <div>Query SQL Results</div>,
              },
            ]}
          />
        </AgentSidebar>
        {props.children}
      </Page>
    </AgentStatusProvider>
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
