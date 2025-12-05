import { v4 as uuidv4 } from 'uuid';
import { ConversationHistory } from '@qwery/ui/ai';
import { useWorkspace } from '~/lib/context/workspace-context';
import { useGetConversationsByProject } from '~/lib/queries/use-get-conversations-by-project';
import { Conversation } from '@qwery/domain/entities';
import pathsConfig from '~/config/paths.config';
import { useNavigate, useParams, useLocation } from 'react-router';
import { createPath } from '~/config/paths.config';
import { useConversation } from '~/lib/mutations/use-conversation';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { getConversationsByProjectKey } from '~/lib/queries/use-get-conversations-by-project';

export function ProjectConversationHistory() {
  const navigate = useNavigate();
  const location = useLocation();
  const projectSlugMatch = location.pathname.match(/^\/prj\/([^/]+)/);
  const projectSlug = projectSlugMatch ? projectSlugMatch[1] : null;
  const conversationSlugMatch = location.pathname.match(/\/c\/([^/]+)$/);
  const currentSlug = conversationSlugMatch ? conversationSlugMatch[1] : null;
  const { repositories, workspace } = useWorkspace();
  const queryClient = useQueryClient();

  const { data: conversations = [], isLoading } = useGetConversationsByProject(
    repositories.conversation,
    workspace.projectId,
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
    workspace.projectId,
  );

  const currentConversation = conversations.find(
    (c: Conversation) => c.slug === currentSlug,
  );
  const currentConversationId = currentConversation?.id;

  const mappedConversations = conversations.map(
    (conversation: Conversation) => ({
      id: conversation.id,
      slug: conversation.slug,
      title: conversation.title,
      createdAt:
        conversation.createdAt instanceof Date
          ? conversation.createdAt
          : new Date(conversation.createdAt),
    }),
  );

  const onConversationSelect = (conversationSlug: string) => {
    navigate(createPath(pathsConfig.app.conversation, conversationSlug));
  };

  const onNewConversation = () => {
    if (!workspace.projectId || !workspace.userId) {
      toast.error('Unable to create conversation: missing workspace context');
      return;
    }
    createConversationMutation.mutate({
      projectId: workspace.projectId,
      taskId: uuidv4(), // TODO: Create or get actual task
      title: 'New Conversation',
      seedMessage: '',
      datasources: [],
      createdBy: workspace.userId,
    });
  };

  const onConversationEdit = async (conversationId: string, newTitle: string) => {
    const conversation = conversations.find((c) => c.id === conversationId);
    if (!conversation) return;

    if (!newTitle.trim() || newTitle === conversation.title) return;

    try {
      await repositories.conversation.update({
        ...conversation,
        title: newTitle.trim(),
        updatedBy: workspace.userId || 'user',
        updatedAt: new Date(),
      });
      queryClient.invalidateQueries({
        queryKey: getConversationsByProjectKey(workspace.projectId || ''),
      });
      toast.success('Conversation updated');
    } catch (error) {
      toast.error(
        `Failed to update conversation: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  };

  const onConversationDelete = async (conversationId: string) => {
    const conversation = conversations.find((c) => c.id === conversationId);
    if (!conversation) return;

    if (
      !window.confirm(
        `Are you sure you want to delete "${conversation.title}"? This action cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      await repositories.conversation.delete(conversationId);
      queryClient.invalidateQueries({
        queryKey: getConversationsByProjectKey(workspace.projectId || ''),
      });

      // If we deleted the current conversation, navigate to conversation index
      if (conversation.slug === currentSlug && projectSlug) {
        navigate(`/prj/${projectSlug}/c`);
      }

      toast.success('Conversation deleted');
    } catch (error) {
      toast.error(
        `Failed to delete conversation: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  };

  return (
    <ConversationHistory
      conversations={mappedConversations}
      isLoading={isLoading}
      currentConversationId={currentConversationId}
      onConversationSelect={onConversationSelect}
      onNewConversation={onNewConversation}
      onConversationEdit={onConversationEdit}
      onConversationDelete={onConversationDelete}
    />
  );
}
