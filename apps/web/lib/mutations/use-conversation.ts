import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Conversation } from '@qwery/domain/entities';
import { IConversationRepository } from '@qwery/domain/repositories';
import {
  CreateConversationService,
  UpdateConversationService,
  DeleteConversationService,
} from '@qwery/domain/services';
import { getConversationsKey } from '~/lib/queries/use-get-conversations';
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
      queryClient.invalidateQueries({
        queryKey: getConversationsKey(),
      });
      // Invalidate project-scoped conversations if projectId provided
      if (projectId) {
        queryClient.invalidateQueries({
          queryKey: getConversationsByProjectKey(projectId),
        });
      }
      // Keep existing predicate-based invalidation as fallback
      queryClient.invalidateQueries({
        predicate: (query) => {
          return (
            Array.isArray(query.queryKey) &&
            query.queryKey[0] === 'conversations' &&
            query.queryKey[1] === 'project'
          );
        },
      });
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
      queryClient.setQueryData(
        getConversationKey(conversation.slug),
        conversation,
      );
      queryClient.invalidateQueries({
        queryKey: getConversationKey(conversation.slug),
      });
      queryClient.invalidateQueries({
        queryKey: getConversationsKey(),
      });
      queryClient.invalidateQueries({
        predicate: (query) => {
          return (
            Array.isArray(query.queryKey) &&
            query.queryKey[0] === 'conversations' &&
            query.queryKey[1] === 'project'
          );
        },
      });
    },
  });
}

export function useDeleteConversation(
  conversationRepository: IConversationRepository,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      const deleteConversationService = new DeleteConversationService(
        conversationRepository,
      );
      return await deleteConversationService.execute(conversationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: getConversationsKey(),
      });
      // Invalidate all project-specific conversation queries
      queryClient.invalidateQueries({
        predicate: (query) => {
          return (
            Array.isArray(query.queryKey) &&
            query.queryKey[0] === 'conversations' &&
            query.queryKey[1] === 'project'
          );
        },
      });
    },
  });
}
