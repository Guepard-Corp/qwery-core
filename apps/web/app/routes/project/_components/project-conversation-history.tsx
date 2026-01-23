import { v4 as uuidv4 } from 'uuid';
import { useEffect, useRef } from 'react';
import { ConversationHistory, useAgentStatus } from '@qwery/ui/ai';
import { useWorkspace } from '~/lib/context/workspace-context';
import { useGetConversationsByProject } from '~/lib/queries/use-get-conversations-by-project';
import { Conversation } from '@qwery/domain/entities';
import pathsConfig from '~/config/paths.config';
import { useNavigate, useLocation } from 'react-router';
import { createPath } from '~/config/paths.config';
import {
  useConversation,
  useUpdateConversation,
  useDeleteConversation,
} from '~/lib/mutations/use-conversation';
import { toast } from 'sonner';

export function ProjectConversationHistory() {
  const navigate = useNavigate();
  const { repositories, workspace } = useWorkspace();
  const location = useLocation();
  const previousTitlesRef = useRef<Map<string, string>>(new Map());
  const { isProcessing, processingConversationSlug } = useAgentStatus();

  const projectId = workspace.projectId as string | undefined;

  const projectSlugMatch = location.pathname.match(/^\/prj\/([^/]+)/);
  const projectSlug = projectSlugMatch?.[1];
  const conversationSlugMatch = location.pathname.match(/\/c\/([^/]+)$/);
  const currentConversationSlug = conversationSlugMatch?.[1];

  const { data: conversations = [], isLoading } = useGetConversationsByProject(
    repositories.conversation,
    projectId,
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
    workspace.projectId as string | undefined,
  );

  const updateConversationMutation = useUpdateConversation(
    repositories.conversation,
  );

  const deleteConversationMutation = useDeleteConversation(
    repositories.conversation,
  );

  const mappedConversations = conversations.map(
    (conversation: Conversation) => ({
      id: conversation.id,
      slug: conversation.slug,
      title: conversation.title,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    }),
  );

  const currentConversation = conversations.find(
    (c: Conversation) => c.slug === currentConversationSlug,
  );
  const currentConversationId = currentConversation?.id;

  useEffect(() => {
    conversations.forEach((conversation) => {
      const previousTitle = previousTitlesRef.current.get(conversation.id);
      const currentTitle = conversation.title;

      if (
        previousTitle &&
        previousTitle === 'New Conversation' &&
        currentTitle !== 'New Conversation' &&
        currentTitle !== previousTitle
      ) {
        toast.success(`Conversation renamed to "${currentTitle}"`, {
          duration: 3000,
        });
      }

      previousTitlesRef.current.set(conversation.id, currentTitle);
    });
  }, [conversations]);

  const onConversationSelect = (conversationSlug: string) => {
    navigate(createPath(pathsConfig.app.conversation, conversationSlug));
  };

  const onNewConversation = () => {
    if (!projectId) {
      toast.error('Project not found');
      return;
    }
    createConversationMutation.mutate({
      projectId: projectId,
      taskId: uuidv4(),
      title: 'New Conversation',
      seedMessage: '',
      datasources: [],
      createdBy: workspace.userId,
    });
  };

  const onConversationEdit = (conversationId: string, newTitle: string) => {
    updateConversationMutation.mutate(
      {
        id: conversationId,
        title: newTitle,
        updatedBy: workspace.userId,
      },
      {
        onSuccess: () => {
          toast.success('Conversation title updated');
        },
        onError: (error) => {
          toast.error(
            `Failed to update conversation: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        },
      },
    );
  };

  const onConversationDelete = (conversationId: string) => {
    deleteConversationMutation.mutate(conversationId, {
      onSuccess: () => {
        toast.success('Conversation deleted');
        if (conversationId === currentConversationId) {
          navigate(createPath(pathsConfig.app.project, projectSlug || ''));
        }
      },
      onError: (error) => {
        toast.error(
          `Failed to delete conversation: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      },
    });
  };

  const onConversationsDelete = async (conversationIds: string[]) => {
    if (conversationIds.length === 0) return;

    const results = await Promise.allSettled(
      conversationIds.map((id) => deleteConversationMutation.mutateAsync(id)),
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    if (succeeded > 0) {
      toast.success(
        `Deleted ${succeeded} conversation${succeeded !== 1 ? 's' : ''}`,
      );
    }

    if (failed > 0) {
      const errors = results
        .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
        .map((r) => r.reason?.message || 'Unknown error')
        .join(', ');
      toast.error(
        `Failed to delete ${failed} conversation${failed !== 1 ? 's' : ''}: ${errors}`,
      );
    }

    if (
      currentConversationId &&
      conversationIds.includes(currentConversationId) &&
      succeeded > 0
    ) {
      navigate(createPath(pathsConfig.app.project, projectSlug || ''));
    }
  };

  return (
    <ConversationHistory
      conversations={mappedConversations}
      isLoading={isLoading}
      currentConversationId={currentConversationId}
      isProcessing={isProcessing}
      processingConversationSlug={processingConversationSlug || undefined}
      onConversationSelect={onConversationSelect}
      onNewConversation={onNewConversation}
      onConversationEdit={onConversationEdit}
      onConversationDelete={onConversationDelete}
      onConversationsDelete={onConversationsDelete}
    />
  );
}
