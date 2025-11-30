import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Workspace } from '@qwery/domain/entities';

import { WorkspaceService } from '../services/workspace-service';
import { WorkspaceModeService } from '../services/workspace-mode-service';
import { WorkspaceModeEnum } from '@qwery/domain/enums';
import { useWorkspace } from '../context/workspace-context';

const workspaceService = new WorkspaceService();
const workspaceModeService = new WorkspaceModeService();

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

export function useSwitchWorkspaceMode() {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();
  return useMutation<void, Error, WorkspaceModeEnum>({
    mutationFn: (mode: WorkspaceModeEnum) => workspaceModeService.execute(mode),
    onSuccess: (_data: void, mode: WorkspaceModeEnum) => {
      queryClient.invalidateQueries({
        queryKey: getWorkspaceQueryKey({ ...workspace, mode }),
      });
    },
  });
}
