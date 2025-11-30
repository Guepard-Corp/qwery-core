import { v4 as uuidv4 } from 'uuid';
import { ConversationHistory } from '@qwery/ui/ai';
import { useWorkspace } from '~/lib/context/workspace-context';
import { useGetConversations } from '~/lib/queries/use-get-conversations';
import { Conversation } from '@qwery/domain/entities';
import pathsConfig from '~/config/paths.config';
import { useNavigate } from 'react-router';
import { createPath } from '~/config/paths.config';
import { useConversation } from '~/lib/mutations/use-conversation';
import { toast } from 'sonner';

export function ProjectConversationHistory() {
  const navigate = useNavigate();
  const { repositories, workspace } = useWorkspace();

  const { data: conversations = [], isLoading } = useGetConversations(
    repositories.conversation,
  );

  const createConversationMutation = useConversation(
    repositories.conversation,
    (conversation) => {
      navigate(createPath(pathsConfig.app.conversation, conversation.slug));
    },
    (error) => {
      toast.error(
        `Failed to create conversation: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    },
  );

  const mappedConversations = conversations.map(
    (conversation: Conversation) => ({
      id: conversation.id,
      slug: conversation.slug,
      title: conversation.title,
      createdAt: conversation.createdAt,
    }),
  );

  const onConversationSelect = (conversationSlug: string) => {
    navigate(createPath(pathsConfig.app.conversation, conversationSlug));
  };

  const onNewConversation = () => {
    createConversationMutation.mutate({
      projectId: workspace.projectId as string,
      taskId: uuidv4(), // TODO: Create or get actual task
      title: 'New Conversation',
      seedMessage: '',
      datasources: [],
      createdBy: workspace.userId,
    });
  };

  return (
    <ConversationHistory
      conversations={mappedConversations}
      isLoading={isLoading}
      onConversationSelect={onConversationSelect}
      onNewConversation={onNewConversation}
    />
  );
}
