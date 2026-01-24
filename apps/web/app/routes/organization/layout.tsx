import { Outlet } from 'react-router';

import {
  Page,
  PageMobileNavigation,
  PageTopNavigation,
} from '@qwery/ui/page';
import type { Route } from '~/types/app/routes/organization/+types/layout';

import { LayoutMobileNavigation } from '../layout/_components/layout-mobile-navigation';
import { OrgLayoutTopBar } from './_components/org-topbar';

export async function loader(_args: Route.LoaderArgs) {
  return {
    layoutState: {
      open: true,
    },
  };
}

function SidebarLayout(props: Route.ComponentProps & React.PropsWithChildren) {
  return (
      <Page>
        <PageTopNavigation>
        <OrgLayoutTopBar />
        </PageTopNavigation>
        <PageMobileNavigation className={'flex items-center justify-between'}>
          <LayoutMobileNavigation />
        </PageMobileNavigation>
        {props.children}
      </Page>
  );
}

export default function Layout(props: Route.ComponentProps) {
  return (
    <SidebarLayout {...props}>
      <Outlet />
    </SidebarLayout>
  );
}
