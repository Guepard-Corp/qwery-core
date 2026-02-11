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

export function WorkspaceProvider(props: React.PropsWithChildren) {
  const [localWorkspace, setLocalWorkspace] = useState<Workspace>(
    getWorkspaceFromLocalStorage(),
  );

  useEffect(() => {
    const handleStorageChange = () => {
      setLocalWorkspace(getWorkspaceFromLocalStorage());
    };

    window.addEventListener('storage', handleStorageChange);

    window.addEventListener('workspace-updated', handleStorageChange);

    const interval = setInterval(handleStorageChange, 500);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('workspace-updated', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const workspaceQuery = useWorkspaceMode(localWorkspace);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
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
        const initResponse = await fetch('/api/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: workspaceQuery.data?.userId ?? '',
            organizationId: workspaceQuery.data?.organizationId,
            projectId: workspaceQuery.data?.projectId,
            mode: workspaceQuery.data?.mode,
            runtime,
          }),
        });
        if (!initResponse.ok) {
          const err = await initResponse.json().catch(() => ({}));
          throw new Error(
            (err as { error?: string }).error ||
              `Init failed: ${initResponse.status}`,
          );
        }
        const initializedWorkspace = (await initResponse.json()) as {
          user: { id: string; username: string };
          organization?: { id: string };
          project?: { id: string };
          isAnonymous: boolean;
          mode: string;
          runtime: string;
        };

        const currentStored = getWorkspaceFromLocalStorage();
        const workspaceData: Workspace = {
          id: currentStored.id || uuidv4(),
          userId: currentStored.userId || initializedWorkspace.user.id,
          username:
            currentStored.username || initializedWorkspace.user.username,
          organizationId: initializedWorkspace.organization?.id,
          projectId: initializedWorkspace.project?.id,
          isAnonymous: initializedWorkspace.isAnonymous,
          mode: (currentStored.mode ||
            initializedWorkspace.mode) as Workspace['mode'],
          runtime: initializedWorkspace.runtime as Workspace['runtime'],
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
