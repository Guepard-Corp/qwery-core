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
    staleTime: 30 * 1000,
    enabled: !!slug,
  });
}
