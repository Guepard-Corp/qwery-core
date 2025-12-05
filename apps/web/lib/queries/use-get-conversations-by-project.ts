import { useQuery } from '@tanstack/react-query';

import { IConversationRepository } from '@qwery/domain/repositories';
import { GetConversationsByProjectIdService } from '@qwery/domain/services';

export function getConversationsByProjectKey(projectId: string) {
  return ['conversations', 'project', projectId];
}

export function useGetConversationsByProject(
  repository: IConversationRepository,
  projectId: string | undefined,
) {
  const useCase = new GetConversationsByProjectIdService(repository);
  return useQuery({
    queryKey: getConversationsByProjectKey(projectId || ''),
    queryFn: () => useCase.execute(projectId!),
    enabled: !!projectId,
    staleTime: 30 * 1000,
  });
}

