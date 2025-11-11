import { Outlet } from 'react-router';

import {
  Page,
  PageMobileNavigation,
  PageNavigation,
  PageTopNavigation,
} from '@qwery/ui/page';
import { SidebarProvider } from '@qwery/ui/shadcn-sidebar';

import { sidebarStateCookie } from '~/lib/cookies';
import type { Route } from '~/types/app/routes/organization/+types/layout';

import { LayoutMobileNavigation } from '../layout/_components/layout-mobile-navigation';
import { LayoutTopBar } from '../layout/_components/layout-topbar';
import { OrgSidebar } from './_components/org-sidebar';

export async function loader(args: Route.LoaderArgs) {
  const request = args.request;

  const [layoutState] = await Promise.all([getLayoutState(request)]);

  return {
    layoutState,
  };
}

async function getLayoutState(request: Request) {
  const cookieHeader = request.headers.get('Cookie');
  const sidebarOpenCookie = await sidebarStateCookie.parse(cookieHeader);

  const sidebarOpenCookieValue = sidebarOpenCookie
    ? sidebarOpenCookie === 'false'
    : true;

  return {
    open: sidebarOpenCookieValue,
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
        <PageNavigation>
          <OrgSidebar />
        </PageNavigation>
        <PageMobileNavigation className={'flex items-center justify-between'}>
          <LayoutMobileNavigation />
        </PageMobileNavigation>
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
