import { Outlet } from 'react-router';

import { Page } from '@qwery/ui/page';
import type { Route } from '~/types/app/routes/organization/+types/layout';

import { OrgBreadcrumb } from './_components/org-breadcrumb';

export async function clientLoader(_args: Route.ClientLoaderArgs) {
  return {
    layoutState: {
      open: true,
    },
  };
}

function SidebarLayout(props: Route.ComponentProps & React.PropsWithChildren) {
  return (
    <Page>
      <div className="flex h-full flex-col">
        <div className="px-4 pt-4 pb-3 lg:px-12 lg:pt-6">
          <div className="w-fit">
            <OrgBreadcrumb />
          </div>
        </div>
        <div className="flex-1 overflow-hidden">{props.children}</div>
      </div>
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
