import { useQuery } from '@tanstack/react-query';

import {
  IConversationRepository,
  IUsageRepository,
} from '@qwery/domain/repositories';
import { GetUsageByConversationSlugService } from '@qwery/domain/services';

export function getUsageKey(conversationSlug: string, userId?: string) {
  return ['usage', 'conversation', conversationSlug, userId].filter(Boolean);
}

export function useGetUsage(
  usageRepository: IUsageRepository,
  conversationRepository: IConversationRepository,
  conversationSlug: string,
  userId: string,
) {
  const useCase = new GetUsageByConversationSlugService(
    usageRepository,
    conversationRepository,
  );

  return useQuery({
    queryKey: getUsageKey(conversationSlug, userId),
    queryFn: () =>
      useCase.execute({
        conversationSlug,
        userId: userId || '',
      }),
    staleTime: 30 * 1000,
    enabled: !!conversationSlug,
  });
}
