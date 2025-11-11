import { createContext, useContext } from 'react';

import { Workspace } from '@qwery/domain/entities';
import {
  DatasourceRepositoryPort,
  NotebookRepositoryPort,
  OrganizationRepositoryPort,
  ProjectRepositoryPort,
  UserRepositoryPort,
} from '@qwery/domain/repositories';

export type Repositories = {
  user: UserRepositoryPort;
  organization: OrganizationRepositoryPort;
  project: ProjectRepositoryPort;
  datasource: DatasourceRepositoryPort;
  notebook: NotebookRepositoryPort;
};

const WorkspaceContext = createContext<{
  repositories: Repositories;
  workspace: Workspace;
} | null>(null);

export function useWorkspace(): {
  repositories: Repositories;
  workspace: Workspace;
} {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}

export { WorkspaceContext };
