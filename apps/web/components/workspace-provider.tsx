'use client';

import { useEffect, useMemo, useState } from 'react';

import { v4 as uuidv4 } from 'uuid';

import type { Workspace } from '@qwery/domain/entities';
import { InitWorkspaceService } from '@qwery/domain/services';
import {
  DatasourceRepository as IndexedDBDatasourceRepository,
  NotebookRepository as IndexedDBNotebookRepository,
  OrganizationRepository as IndexedDBOrganizationRepository,
  ProjectRepository as IndexedDBProjectRepository,
  UserRepository as IndexedDBUserRepository,
} from '@qwery/repository-indexed-db';
import { LoadingOverlay } from '@qwery/ui/loading-overlay';
import { Trans } from '@qwery/ui/trans';

import { WorkspaceContext } from '~/lib/context/workspace-context';
import { useWorkspaceMode } from '~/lib/hooks/use-workspace-mode';
import { WorkspaceService } from '~/lib/services/workspace-service';
import {
  getWorkspaceFromLocalStorage,
  setWorkspaceInLocalStorage,
} from '~/lib/workspace/workspace-helper';

export function WorkspaceProvider(props: React.PropsWithChildren) {
  const localWorkspace = getWorkspaceFromLocalStorage();

  const workspaceQuery = useWorkspaceMode(localWorkspace);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const repositories = useMemo(() => {
    if (!workspaceQuery.data) {
      return null;
    }

    return {
      user: new IndexedDBUserRepository(),
      organization: new IndexedDBOrganizationRepository(),
      project: new IndexedDBProjectRepository(),
      datasource: new IndexedDBDatasourceRepository(),
      notebook: new IndexedDBNotebookRepository(),
    };
  }, [workspaceQuery.data]);

  useEffect(() => {
    if (!repositories || !workspaceQuery.data) {
      return;
    }

    const initWorkspace = async () => {
      setIsInitializing(true);
      try {
        const initWorkspaceService = new InitWorkspaceService(
          repositories.user,
          new WorkspaceService(),
          repositories.organization,
          repositories.project,
        );
        const initializedWorkspace = await initWorkspaceService.execute({
          userId: workspaceQuery.data?.userId as string,
          organizationId: workspaceQuery.data?.organizationId as string,
          projectId: workspaceQuery.data?.projectId as string,
        });

        // Convert WorkspaceUseCaseDto to Workspace format
        const workspaceData: Workspace = {
          id: uuidv4(),
          userId: initializedWorkspace.user.id,
          username: initializedWorkspace.user.username,
          organizationId: initializedWorkspace.organization?.id,
          projectId: initializedWorkspace.project?.id,
          isAnonymous: initializedWorkspace.isAnonymous,
          mode: initializedWorkspace.mode,
        };

        setWorkspace(workspaceData);

        // Only update localStorage for organization/project changes, not for anonymous user IDs
        // Anonymous users get new IDs each time, which would cause infinite loops
        const currentStored = getWorkspaceFromLocalStorage();
        const workspaceToStore: Workspace = {
          id: workspaceData.id,
          userId: currentStored.userId || initializedWorkspace.user.id,
          username:
            currentStored.username || initializedWorkspace.user.username,
          organizationId: initializedWorkspace.organization?.id,
          projectId: initializedWorkspace.project?.id,
          isAnonymous: initializedWorkspace.isAnonymous,
          mode: initializedWorkspace.mode,
        };
        setWorkspaceInLocalStorage(workspaceToStore);
      } finally {
        setIsInitializing(false);
      }
    };

    initWorkspace();
  }, [repositories, workspaceQuery.data]);

  const isLoading =
    workspaceQuery.isLoading || !repositories || isInitializing || !workspace;

  if (isLoading) {
    return (
      <LoadingOverlay fullPage>
        <Trans i18nKey="common:initializing" />
      </LoadingOverlay>
    );
  }

  if (!repositories || !workspace) {
    return null;
  }

  return (
    <WorkspaceContext.Provider value={{ repositories, workspace }}>
      {props.children}
    </WorkspaceContext.Provider>
  );
}
