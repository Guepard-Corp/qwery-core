import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Conversation } from '@qwery/domain/entities';
import { IConversationRepository } from '@qwery/domain/repositories';
import { CreateConversationService } from '@qwery/domain/services';
import {
  ConversationOutput,
  CreateConversationInput,
} from '@qwery/domain/usecases';

export function getConversationKey(slug: string) {
  return ['conversation', slug];
}

export function getConversationsByProjectIdKey(projectId: string) {
  return ['conversations', 'project', projectId];
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
        queryKey: getConversationsByProjectIdKey(conversation.projectId),
      });
      // Convert DTO back to Conversation for the callback
      onSuccess(conversation as unknown as Conversation);
    },
    onError,
  });
}
