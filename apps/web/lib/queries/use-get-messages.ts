import { useQuery } from '@tanstack/react-query';

import {
  IConversationRepository,
  IMessageRepository,
} from '@qwery/domain/repositories';
import { GetMessagesByConversationSlugService } from '@qwery/domain/services';

export function getMessagesByConversationSlugKey(slug: string) {
  return ['messages', 'conversation', 'slug', slug];
}

export function useGetMessagesByConversationSlug(
  conversationRepository: IConversationRepository,
  messageRepository: IMessageRepository,
  slug: string,
  options?: { enabled?: boolean; refetchInterval?: number },
) {
  return useQuery({
    queryKey: getMessagesByConversationSlugKey(slug),
    queryFn: async () => {
      const useCase = new GetMessagesByConversationSlugService(
        messageRepository,
        conversationRepository,
      );
      return useCase.execute({ conversationSlug: slug });
    },
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled:
      options?.enabled !== undefined ? options.enabled && !!slug : !!slug,
    refetchInterval: options?.refetchInterval,
  });
}
