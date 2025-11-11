import { useParams } from 'react-router';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarNavigation,
} from '@qwery/ui/shadcn-sidebar';

import { AccountDropdownContainer } from '~/components/account-dropdown-container';
import { createNavigationConfig } from '~/config/org.navigation.config';

export function OrgSidebar() {
  const params = useParams();
  const slug = params.slug as string;
  const navigationConfig = createNavigationConfig(slug);
  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarNavigation config={navigationConfig} />
      </SidebarContent>
      <SidebarFooter>
        <AccountDropdownContainer />
      </SidebarFooter>
    </Sidebar>
  );
}
