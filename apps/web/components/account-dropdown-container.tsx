'use client';

import { useEffect, useState } from 'react';
import { AccountDropdown } from '@qwery/accounts/account-dropdown';
import type { SearchEngine } from '@qwery/ui/ai';
import { isSearchEngine } from '@qwery/ui/ai';
import { WorkspaceModeEnum } from '@qwery/domain/enums';
import { useWorkspace } from '~/lib/context/workspace-context';
import { useSwitchWorkspaceMode } from '~/lib/hooks/use-workspace-mode';

import pathsConfig from '~/config/paths.config';

const PREFERRED_SEARCH_ENGINE_KEY = 'qwery-preferred-search-engine';

const paths = {
  home: pathsConfig.app.home,
};

function getStoredSearchEngine(): SearchEngine {
  if (typeof window === 'undefined') return 'google';
  try {
    const v = localStorage.getItem(PREFERRED_SEARCH_ENGINE_KEY);
    return v && isSearchEngine(v) ? v : 'google';
  } catch {
    return 'google';
  }
}

export function AccountDropdownContainer() {
  const { workspace } = useWorkspace();
  const { mutate: switchWorkspaceMode } = useSwitchWorkspaceMode();
  const [preferredSearchEngine, setPreferredSearchEngine] =
    useState<SearchEngine>(getStoredSearchEngine);

  useEffect(() => {
    try {
      localStorage.setItem(PREFERRED_SEARCH_ENGINE_KEY, preferredSearchEngine);
    } catch {
      /* ignore */
    }
  }, [preferredSearchEngine]);

  useEffect(() => {
    const handler = () => setPreferredSearchEngine(getStoredSearchEngine());
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

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
      preferredSearchEngine={preferredSearchEngine}
      onPreferredSearchEngineChange={setPreferredSearchEngine}
    />
  );
}
