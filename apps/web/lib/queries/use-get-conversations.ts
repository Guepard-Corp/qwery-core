import { useQuery } from '@tanstack/react-query';

import { IConversationRepository } from '@qwery/domain/repositories';
import { GetConversationsService } from '@qwery/domain/services';

export function getConversationsKey() {
  return ['conversations'];
}

export function useGetConversations(repository: IConversationRepository) {
  const useCase = new GetConversationsService(repository);
  return useQuery({
    queryKey: getConversationsKey(),
    queryFn: () => useCase.execute(),
    staleTime: 30 * 1000,
  });
}
