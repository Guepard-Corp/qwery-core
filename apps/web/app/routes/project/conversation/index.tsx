import { useProject } from '~/lib/context/project-context';
import { useWorkspace } from '~/lib/context/workspace-context';
import { useNavigate, useLocation } from 'react-router';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import {
  useConversation,
  useUpdateConversation,
  useDeleteConversation,
} from '~/lib/mutations/use-conversation';
import { useGetConversationsByProject } from '~/lib/queries/use-get-conversations-by-project';
import { createPath } from '~/config/paths.config';
import pathsConfig from '~/config/paths.config';
import { Conversation as DomainConversation } from '@qwery/domain/entities';
import { useMemo, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, X } from 'lucide-react';
import { ConversationList, Conversation, useAgentStatus } from '@qwery/ui/ai';
import { Button } from '@qwery/ui/button';
import { Input } from '@qwery/ui/input';
import { MagnifyingGlassIcon } from '@radix-ui/react-icons';

export default function ConversationIndexPage() {
  const { t } = useTranslation(['chat', 'common']);
  const { repositories, workspace } = useWorkspace();
  const { projectId, projectSlug, isLoading: isProjectLoading } = useProject();
  const navigate = useNavigate();
  const location = useLocation();
  const { isProcessing, processingConversationSlug } = useAgentStatus();

  const conversationSlugMatch = location.pathname.match(/\/c\/([^/]+)$/);
  const currentConversationSlug = conversationSlugMatch?.[1];

  const { data: conversations = [], isLoading: isLoadingConversations } =
    useGetConversationsByProject(
      repositories.conversation,
      projectId ?? undefined,
    );

  const createConversationMutation = useConversation(
    repositories.conversation,
    (conversation) => {
      navigate(createPath(pathsConfig.app.conversation, conversation.slug));
    },
    (error) => {
      toast.error(
        t('chat:create_error', {
          error: error instanceof Error ? error.message : 'Unknown error',
          defaultValue: 'Failed to create conversation: {{error}}',
        }),
      );
    },
    projectId,
  );

  const updateConversationMutation = useUpdateConversation(
    repositories.conversation,
  );

  const deleteConversationMutation = useDeleteConversation(
    repositories.conversation,
  );

  const mappedConversations: Conversation[] = useMemo(() => {
    return conversations.map((conversation: DomainConversation) => ({
      id: conversation.id,
      slug: conversation.slug,
      title: conversation.title,
      createdAt:
        conversation.createdAt instanceof Date
          ? conversation.createdAt
          : new Date(conversation.createdAt),
      updatedAt:
        conversation.updatedAt instanceof Date
          ? conversation.updatedAt
          : new Date(conversation.updatedAt),
    }));
  }, [conversations]);

  const previousTitlesRef = useRef<Map<string, string>>(new Map());

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
        toast.success(t('chat:renamed_success', { title: currentTitle }), {
          duration: 3000,
        });
      }

      previousTitlesRef.current.set(conversation.id, currentTitle);
    });
  }, [conversations, t]);

  const currentConversation = conversations.find(
    (c: DomainConversation) => c.slug === currentConversationSlug,
  );
  const currentConversationId = currentConversation?.id;

  const onConversationSelect = (conversationSlug: string) => {
    navigate(createPath(pathsConfig.app.conversation, conversationSlug));
  };

  const onNewConversation = () => {
    if (!projectId) {
      toast.error(t('chat:project_not_found'));
      return;
    }
    createConversationMutation.mutate({
      projectId,
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
          toast.success(t('chat:update_success'));
        },
        onError: (error) => {
          toast.error(
            t('chat:update_error', {
              error: error instanceof Error ? error.message : 'Unknown error',
              defaultValue: 'Failed to update conversation: {{error}}',
            }),
          );
        },
      },
    );
  };

  const onConversationDelete = (conversationId: string) => {
    deleteConversationMutation.mutate(conversationId, {
      onSuccess: () => {
        toast.success(t('chat:delete_success'));
        if (conversationId === currentConversationId) {
          navigate(createPath(pathsConfig.app.project, projectSlug || ''));
        }
      },
      onError: (error) => {
        toast.error(
          t('chat:delete_error', {
            error: error instanceof Error ? error.message : 'Unknown error',
            defaultValue: 'Failed to delete conversation: {{error}}',
          }),
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
        t('chat:delete_bulk_success', {
          count: succeeded,
          defaultValue: 'Deleted {{count}} conversation',
        }),
      );
    }

    if (failed > 0) {
      const errors = results
        .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
        .map((r) => r.reason?.message || 'Unknown error')
        .join(', ');
      toast.error(
        t('chat:delete_bulk_error', {
          count: failed,
          errors,
          defaultValue: 'Failed to delete {{count}} conversations: {{errors}}',
        }),
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

  const isLoading = isLoadingConversations || isProjectLoading;
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);

  return (
    <div className="bg-background flex h-screen w-full flex-col overflow-hidden">
      <div className="flex h-full flex-col">
        <section className="flex shrink-0 flex-col gap-6 px-8 py-6 lg:px-16 lg:py-10">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">{t('chat:title')}</h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-muted/30 border-border/50 focus-within:border-border flex h-12 flex-1 items-center gap-3 rounded-xl border px-4 transition-all focus-within:bg-transparent">
              <MagnifyingGlassIcon className="text-muted-foreground/60 h-5 w-5 shrink-0" />
              <Input
                type="text"
                placeholder={t('chat:search_placeholder')}
                className="h-full flex-1 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer rounded-full p-1 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button
              onClick={onNewConversation}
              className="h-11 bg-[#ffcb51] px-5 font-bold text-black hover:bg-[#ffcb51]/90"
            >
              <Plus className="mr-2 h-4 w-4" />
              {t('chat:new_chat')}
            </Button>
          </div>
        </section>

        <div className="min-h-0 flex-1 overflow-hidden px-8 lg:px-16">
          {isLoading ? (
            <div className="bg-muted/10 h-full w-full animate-pulse rounded-2xl" />
          ) : (
            <ConversationList
              conversations={mappedConversations}
              isLoading={isLoading}
              currentConversationId={currentConversationId}
              isProcessing={isProcessing}
              processingConversationSlug={
                processingConversationSlug || undefined
              }
              onConversationSelect={onConversationSelect}
              onNewConversation={onNewConversation}
              onConversationEdit={onConversationEdit}
              onConversationDelete={onConversationDelete}
              onConversationsDelete={onConversationsDelete}
              showHeader={false}
              showNewButton={false}
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              isEditMode={isEditMode}
              onEditModeChange={setIsEditMode}
              className="h-full"
            />
          )}
        </div>
      </div>
    </div>
  );
}
