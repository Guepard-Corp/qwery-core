import { useParams } from 'react-router';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
} from '@qwery/ui/shadcn-sidebar';
import { SidebarNavigation } from '@qwery/ui/sidebar-navigation';

import { AccountDropdownContainer } from '~/components/account-dropdown-container';
import { createNavigationConfig } from '~/config/org.navigation.config';

export function OrgSidebar() {
  const params = useParams();
  const slug = params.slug as string;
  const navigationConfig = createNavigationConfig(slug);
  return (
    <Sidebar collapsible="none">
      <SidebarContent>
        <SidebarNavigation config={navigationConfig} />
      </SidebarContent>
      <SidebarFooter>
        <AccountDropdownContainer />
      </SidebarFooter>
    </Sidebar>
  );
}
