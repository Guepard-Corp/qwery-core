import { Outlet } from 'react-router';

import { Page, PageTopNavigation } from '@qwery/ui/page';
import { SidebarProvider } from '@qwery/ui/shadcn-sidebar';
import type { Route } from '~/types/app/routes/organizations/+types/layout';

import { LayoutTopBar } from '../layout/_components/layout-topbar';

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
    <SidebarProvider defaultOpen={layoutState.open}>
      <Page>
        <PageTopNavigation>
          <LayoutTopBar />
        </PageTopNavigation>
        {props.children}
      </Page>
    </SidebarProvider>
  );
}

export default function Layout(props: Route.ComponentProps) {
  return (
    <SidebarLayout {...props}>
      <Outlet />
    </SidebarLayout>
  );
}
