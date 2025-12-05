import { useWorkspace } from '~/lib/context/workspace-context';
import { useParams, useNavigate } from 'react-router';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import {
  ConversationWelcome,
  PromptInputMessage,
} from '@qwery/ui/ai';
import { useConversation } from '~/lib/mutations/use-conversation';
import { useGetProjectBySlug } from '~/lib/queries/use-get-projects';
import { createPath } from '~/config/paths.config';
import pathsConfig from '~/config/paths.config';

export default function ConversationIndexPage() {
  const { workspace, repositories } = useWorkspace();
  const navigate = useNavigate();
  const projectSlug = useParams().slug;

  const project = useGetProjectBySlug(repositories.project, projectSlug || '');

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

  const handleSubmit = (message: PromptInputMessage) => {
    if (!project.data) {
      toast.error('Project not found');
      return;
    }

    if (!repositories.conversation) {
      toast.error('Conversation repository not available');
      return;
    }

    if (!workspace.userId) {
      toast.error('User not authenticated');
      return;
    }

    const messageText = message.text?.trim() || 'New Conversation';

    createConversationMutation.mutate({
      projectId: project.data.id,
      taskId: uuidv4(), // TODO: Create or get actual task
      title: messageText.slice(0, 100),
      seedMessage: messageText,
      datasources: [],
      createdBy: workspace.userId,
    });
  };

  return (
    <ConversationWelcome
      onSubmit={handleSubmit}
      status={createConversationMutation.isPending ? 'streaming' : undefined}
    />
  );
}
