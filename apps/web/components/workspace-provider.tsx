'use client';

import { useEffect, useMemo, useState } from 'react';

import { v4 as uuidv4 } from 'uuid';

import type { Workspace } from '@qwery/domain/entities';
import type { Repositories } from '@qwery/domain/repositories';
import { LoadingOverlay } from '@qwery/ui/loading-overlay';
import { Trans } from '@qwery/ui/trans';

import { WorkspaceContext } from '~/lib/context/workspace-context';
import { useWorkspaceMode } from '~/lib/hooks/use-workspace-mode';
import { createRepositories } from '~/lib/repositories/repositories-factory';
import { WorkspaceService } from '~/lib/services/workspace-service';
import {
  getWorkspaceFromLocalStorage,
  setWorkspaceInLocalStorage,
} from '~/lib/workspace/workspace-helper';

const STORAGE_KEYS: (keyof Workspace)[] = [
  'id',
  'userId',
  'username',
  'organizationId',
  'projectId',
  'isAnonymous',
  'mode',
];

function workspaceStorageEqual(a: Workspace, b: Workspace): boolean {
  return STORAGE_KEYS.every((k) => a[k] === b[k]);
}

export function WorkspaceProvider(props: React.PropsWithChildren) {
  const [localWorkspace, setLocalWorkspace] = useState<Workspace>(
    getWorkspaceFromLocalStorage(),
  );

  const [workspace, setWorkspace] = useState<Workspace | null>(null);

  useEffect(() => {
    const handleStorageChange = () => {
      const updated = getWorkspaceFromLocalStorage();
      setLocalWorkspace((prev) =>
        workspaceStorageEqual(prev, updated) ? prev : updated,
      );
      setWorkspace((prev) => {
        const next = prev ? { ...prev, ...updated } : null;
        if (!prev || !next) return next;
        return workspaceStorageEqual(prev, next) ? prev : next;
      });
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('workspace-updated', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('workspace-updated', handleStorageChange);
    };
  }, []);

  const workspaceQuery = useWorkspaceMode(localWorkspace);
  const [repositories, setRepositories] = useState<Repositories | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    if (!workspaceQuery.data) {
      return;
    }

    let cancelled = false;

    createRepositories().then((repos) => {
      if (!cancelled) {
        setRepositories(repos);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [workspaceQuery.data]);

  useEffect(() => {
    if (!workspaceQuery.data) {
      return;
    }

    const initWorkspace = async () => {
      setIsInitializing(true);
      try {
        const workspaceService = new WorkspaceService();
        const runtime = await workspaceService.execute();

        const currentStored = getWorkspaceFromLocalStorage();
        const workspaceData: Workspace = {
          id: currentStored.id || uuidv4(),
          userId: currentStored.userId,
          username: currentStored.username,
          organizationId: currentStored.organizationId,
          projectId: currentStored.projectId,
          isAnonymous: currentStored.isAnonymous,
          mode: currentStored.mode as Workspace['mode'],
          runtime: runtime,
        };
        setWorkspaceInLocalStorage(workspaceData);
        setWorkspace(workspaceData);
      } finally {
        setIsInitializing(false);
      }
    };

    initWorkspace();
  }, [workspaceQuery.data]);

  const contextValue = useMemo(() => {
    if (!repositories || !workspace) {
      return null;
    }
    return {
      repositories,
      workspace,
    };
  }, [repositories, workspace]);

  const isLoading =
    workspaceQuery.isLoading || !repositories || isInitializing || !workspace;

  if (isLoading) {
    return (
      <LoadingOverlay fullPage>
        <Trans i18nKey="common:initializing" />
      </LoadingOverlay>
    );
  }

  if (!contextValue) {
    return null;
  }

  return (
    <WorkspaceContext.Provider value={contextValue}>
      {props.children}
    </WorkspaceContext.Provider>
  );
}
