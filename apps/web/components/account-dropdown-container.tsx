'use client';

import { AccountDropdown } from '@qwery/accounts/account-dropdown';

import pathsConfig from '~/config/paths.config';

const paths = {
  home: pathsConfig.app.home,
};

export function AccountDropdownContainer() {
  return <AccountDropdown paths={paths} />;
}
