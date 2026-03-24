'use client';

import { AccountDropdown } from '@qwery/accounts/account-dropdown';
import { WorkspaceModeEnum } from '@qwery/domain/enums';
import { useWorkspace } from '~/lib/context/workspace-context';
import { useSwitchWorkspaceMode } from '~/lib/hooks/use-workspace-mode';

import pathsConfig from '~/config/paths.config';

const paths = {
  home: pathsConfig.app.home,
};

export function AccountDropdownContainer() {
  const { workspace } = useWorkspace();
  const { mutate: switchWorkspaceMode } = useSwitchWorkspaceMode();

  const handleWorkspaceModeChange = (mode: 'simple' | 'advanced') => {
    const modeEnum =
      mode === 'advanced'
        ? WorkspaceModeEnum.ADVANCED
        : WorkspaceModeEnum.SIMPLE;
    switchWorkspaceMode(modeEnum, {
      onSuccess: () => {
        window.location.reload();
      },
    });
  };

  return (
    <AccountDropdown
      paths={paths}
      workspaceMode={
        workspace.mode === WorkspaceModeEnum.ADVANCED ? 'advanced' : 'simple'
      }
      onWorkspaceModeChange={handleWorkspaceModeChange}
    />
  );
}
