import { createContext, useContext } from 'react';

import { Workspace } from '@qwery/domain/entities';
import { Repositories } from '@qwery/domain/repositories';

type WorkspaceContextValue = {
  repositories: Repositories;
  workspace: Workspace;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function useWorkspace(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}

export { WorkspaceContext };
