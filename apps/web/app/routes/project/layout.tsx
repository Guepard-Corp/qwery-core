import { Outlet } from 'react-router';

import {
  Page,
  PageFooter,
  PageMobileNavigation,
  PageNavigation,
  PageTopNavigation,
} from '@qwery/ui/page';
import { SidebarProvider } from '@qwery/ui/shadcn-sidebar';

import { sidebarStateCookie } from '~/lib/cookies';
import type { Route } from '~/types/app/routes/project/+types/layout';

import { LayoutFooter } from '../layout/_components/layout-footer';
import { LayoutMobileNavigation } from '../layout/_components/layout-mobile-navigation';
import { LayoutTopBar } from '../layout/_components/layout-topbar';
import { ProjectSidebar } from './_components/project-sidebar';

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
          <ProjectSidebar />
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
  );
}

export default function Layout(props: Route.ComponentProps) {
  return (
    <SidebarLayout {...props}>
      <Outlet />
    </SidebarLayout>
  );
}
