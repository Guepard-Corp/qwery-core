import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Conversation } from '@qwery/domain/entities';
import { IConversationRepository } from '@qwery/domain/repositories';
import {
  CreateConversationService,
  UpdateConversationService,
} from '@qwery/domain/services';
import { getConversationsByProjectKey } from '~/lib/queries/use-get-conversations-by-project';
import {
  ConversationOutput,
  CreateConversationInput,
  UpdateConversationInput,
} from '@qwery/domain/usecases';

export function getConversationKey(slug: string) {
  return ['conversation', slug];
}

export function useConversation(
  conversationRepository: IConversationRepository,
  onSuccess: (conversation: Conversation) => void,
  onError: (error: Error) => void,
  projectId?: string,
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
      // Invalidate project-scoped conversations list
      if (projectId) {
        queryClient.invalidateQueries({
          queryKey: getConversationsByProjectKey(projectId),
        });
      }
      // Convert DTO back to Conversation for the callback
      onSuccess(conversation as unknown as Conversation);
    },
    onError,
  });
}

export function useUpdateConversation(
  conversationRepository: IConversationRepository,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationDTO: UpdateConversationInput) => {
      const updateConversationService = new UpdateConversationService(
        conversationRepository,
      );
      return await updateConversationService.execute(conversationDTO);
    },
    onSuccess: (conversation: ConversationOutput) => {
      queryClient.invalidateQueries({
        queryKey: getConversationKey(conversation.slug),
      });
      queryClient.invalidateQueries({
        queryKey: getConversationsKey(),
      });
    },
  });
}
