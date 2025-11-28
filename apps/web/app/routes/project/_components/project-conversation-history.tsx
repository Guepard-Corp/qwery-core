import { ConversationHistory } from '@qwery/ui/ai';
import { useWorkspace } from '~/lib/context/workspace-context';
import { useGetConversations } from '~/lib/queries/use-get-conversations';
import { Conversation } from '@qwery/domain/entities';

export function ProjectConversationHistory() {
  const { repositories } = useWorkspace();
  const { data: conversations = [], isLoading } = useGetConversations(
    repositories.conversation,
  );

  const mappedConversations = conversations.map(
    (conversation: Conversation) => ({
      id: conversation.id,
      title: conversation.title,
      createdAt: conversation.createdAt,
    }),
  );

  return (
    <ConversationHistory
      conversations={mappedConversations}
      isLoading={isLoading}
    />
  );
}
