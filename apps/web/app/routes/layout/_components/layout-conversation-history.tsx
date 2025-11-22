import { ConversationHistory } from '@qwery/ui/ai';
import { useWorkspace } from '~/lib/context/workspace-context';
import { useGetConversations } from '~/lib/queries/use-get-conversations';

export function LayoutConversationHistory() {
  const { repositories } = useWorkspace();
  const { data: conversations = [], isLoading } = useGetConversations(
    repositories.conversation,
  );

  const mappedConversations = conversations.map((conversation) => ({
    id: conversation.id,
    title: conversation.title,
    createdAt: conversation.createdAt,
  }));

  return (
    <ConversationHistory
      conversations={mappedConversations}
      isLoading={isLoading}
    />
  );
}
