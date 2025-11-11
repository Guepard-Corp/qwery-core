import { useQuery } from '@tanstack/react-query';

import { Workspace } from '@qwery/domain/entities';

import { WorkspaceService } from '../services/workspace-service';

const workspaceService = new WorkspaceService();

export function getWorkspaceQueryKey(workspace?: Workspace) {
  // Use stable values for the query key instead of the entire object
  return [
    'workspace',
    workspace?.userId,
    workspace?.organizationId,
    workspace?.projectId,
  ];
}

export function useWorkspaceMode(workspace: Workspace) {
  return useQuery<Workspace>({
    queryKey: getWorkspaceQueryKey(workspace),
    queryFn: () => workspaceService.getWorkspace(workspace),
  });
}
