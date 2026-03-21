import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { getConversationKey } from '~/lib/mutations/use-conversation';
import { getConversationsKey } from '~/lib/queries/use-get-conversations';
import { getConversationsByProjectKey } from '~/lib/queries/use-get-conversations-by-project';

interface ConversationWithTitle {
  slug: string;
  title: string;
}

export function useConversationRenameToast(
  conversation: ConversationWithTitle | undefined,
  datasourceProjectId: string,
) {
  const queryClient = useQueryClient();
  const { t } = useTranslation('chat');
  const previousTitleRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!conversation) return;
    const previousTitle = previousTitleRef.current;
    const currentTitle = conversation.title;

    const didRenameFromNewToCustom =
      previousTitle === 'New Conversation' &&
      currentTitle !== 'New Conversation' &&
      currentTitle !== previousTitle;

    if (didRenameFromNewToCustom) {
      toast.success(
        t('renamed_success', {
          title: currentTitle,
        }),
      );
      queryClient.invalidateQueries({
        queryKey: getConversationKey(conversation.slug),
      });
      queryClient.invalidateQueries({
        queryKey: getConversationsKey(),
      });
      queryClient.invalidateQueries({
        queryKey: getConversationsByProjectKey(datasourceProjectId),
      });
    }

    previousTitleRef.current = currentTitle;
  }, [conversation, queryClient, t, datasourceProjectId]);
}
