import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Conversation } from '@qwery/domain/entities';
import { IConversationRepository } from '@qwery/domain/repositories';
import { CreateConversationService } from '@qwery/domain/services';
import { getConversationsKey } from '~/lib/queries/use-get-conversations';
import {
  ConversationOutput,
  CreateConversationInput,
} from '@qwery/domain/usecases';

export function getConversationKey(slug: string) {
  return ['conversation', slug];
}

export function useConversation(
  conversationRepository: IConversationRepository,
  onSuccess: (conversation: Conversation) => void,
  onError: (error: Error) => void,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationDTO: CreateConversationInput) => {
      const createConversationService = new CreateConversationService(
        conversationRepository,
      );
      return await createConversationService.execute(conversationDTO);
    },
    onSuccess: (conversation: ConversationOutput) => {
      queryClient.invalidateQueries({
        queryKey: getConversationKey(conversation.slug),
      });
      queryClient.invalidateQueries({
        queryKey: getConversationsKey(),
      });
      // Convert DTO back to Conversation for the callback
      onSuccess(conversation as unknown as Conversation);
    },
    onError,
  });
}
