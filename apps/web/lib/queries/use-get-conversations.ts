import { useQuery } from '@tanstack/react-query';

import { IConversationRepository } from '@qwery/domain/repositories';
import { GetConversationsService } from '@qwery/domain/services';

export function useGetConversations(repository: IConversationRepository) {
  const useCase = new GetConversationsService(repository);
  return useQuery({
    queryKey: ['conversations'],
    queryFn: () => useCase.execute(),
    staleTime: 30 * 1000,
  });
}
