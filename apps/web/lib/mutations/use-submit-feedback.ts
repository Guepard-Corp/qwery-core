import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { FeedbackPayload } from '@qwery/ui/ai';
import { apiPost } from '~/lib/repositories/api-client';
import { getMessagesByConversationSlugKey } from '~/lib/queries/use-get-messages';

export type SubmitFeedbackInput = {
  messageId: string;
  feedback: FeedbackPayload;
};

export type UseSubmitFeedbackOptions = {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
};

export function useSubmitFeedback(
  conversationSlug: string,
  options?: UseSubmitFeedbackOptions,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SubmitFeedbackInput) => {
      await apiPost('/feedback', {
        messageId: input.messageId,
        conversationSlug,
        ...input.feedback,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: getMessagesByConversationSlugKey(conversationSlug),
      });
      options?.onSuccess?.();
    },
    onError: (error) => {
      options?.onError?.(error);
    },
  });
}
