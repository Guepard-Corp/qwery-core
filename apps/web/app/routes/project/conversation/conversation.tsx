import { useGetMessagesByConversationSlug } from '~/lib/queries/use-get-messages';
import { useGetConversationBySlug } from '~/lib/queries/use-get-conversations';
import { useGetNotebookById } from '~/lib/queries/use-get-notebook';
import Agent from '../_components/agent';
import { useParams, useNavigate } from 'react-router';
import { useWorkspace } from '~/lib/context/workspace-context';
import { useEffect, useRef, useMemo } from 'react';
import type { AgentUIWrapperRef } from '../_components/agent-ui-wrapper';
import { BotAvatar } from '@qwery/ui/bot-avatar';
import { Button } from '@qwery/ui/button';
import {
  Archive,
  FileText,
  MoreHorizontal,
  Pencil,
  Bookmark,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import pathsConfig, { createPath } from '~/config/paths.config';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@qwery/ui/dropdown-menu';
import { useDeleteConversation } from '~/lib/mutations/use-conversation';
import { useConversationListPrefsStore } from '~/lib/store/use-conversation-list-prefs';
import { useTranslation } from 'react-i18next';
import { cn } from '@qwery/ui/utils';
import {
  buildChatMarkdownFilenameBase,
  downloadFullChatMarkdown,
} from '@qwery/ui/ai';
import {
  clearLegacyPendingChatLocalStorage,
  consumeChatBootstrapMessage,
} from '~/lib/utils/chat-session-bootstrap';
import { convertMessages } from '~/lib/utils/messages-converter';

const GENERIC_CHAT_SUGGESTIONS = [
  'What can you help me with?',
  'What questions can I ask about my data?',
  'Show me a sample of my data',
];

export default function ConversationPage() {
  const { slug } = useParams();
  if (!slug) {
    throw new Response('Not Found', { status: 404 });
  }
  const navigate = useNavigate();
  const { repositories, workspace: _workspace } = useWorkspace();
  const { t } = useTranslation('common');
  const agentRef = useRef<AgentUIWrapperRef>(null);

  const getMessages = useGetMessagesByConversationSlug(
    repositories.conversation,
    repositories.message,
    slug,
  );

  const getConversation = useGetConversationBySlug(
    repositories.conversation,
    slug,
  );

  const deleteConversationMutation = useDeleteConversation(
    repositories.conversation,
  );

  const isLoading = getMessages.isLoading || getConversation.isLoading;

  if (!isLoading && !getConversation.data) {
    throw new Response('Not Found', { status: 404 });
  }

  const notebookId = useMemo(() => {
    const conversation = getConversation.data;
    if (!conversation?.title) return null;

    const notebookTitlePattern = /^Notebook - (.+)$/;
    const match = conversation.title.match(notebookTitlePattern);
    return match ? match[1] : null;
  }, [getConversation.data]);

  const notebook = useGetNotebookById(repositories.notebook, notebookId || '', {
    enabled: !!notebookId,
  });

  const handleGoToNotebook = () => {
    if (!notebook.data?.slug || !slug) return;

    const notebookPath = createPath(
      pathsConfig.app.projectNotebook,
      notebook.data.slug,
    );
    const url = new URL(notebookPath, window.location.origin);
    url.searchParams.set('conversation', slug);
    navigate(url.pathname + url.search);
  };

  const currentConversation = getConversation.data;

  const { bookmarkedIds, toggleBookmark: toggleBookmarkInStore } =
    useConversationListPrefsStore();

  const isBookmarked =
    currentConversation && bookmarkedIds.includes(currentConversation.id);

  const handleRename = () => {
    if (!currentConversation) return;
    window.dispatchEvent(
      new CustomEvent('conversation-breadcrumb-rename-start'),
    );
  };

  const handleToggleBookmark = () => {
    if (!currentConversation) return;
    toggleBookmarkInStore(currentConversation.id);
  };

  const handleDelete = () => {
    if (!currentConversation) return;
    const confirmed = window.confirm(
      t('chat:delete_confirm', {
        defaultValue: 'Delete this conversation? This cannot be undone.',
      }),
    );
    if (!confirmed) return;

    deleteConversationMutation.mutate(currentConversation.id, {
      onSuccess: () => {
        toast.success(
          t('chat:delete_success', {
            defaultValue: 'Conversation deleted',
          }),
        );
        navigate(-1);
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

  const handleExportChat = () => {
    if (!slug || !getMessages.data || getMessages.data.length === 0) {
      toast.error(
        t('chat:export_error', {
          defaultValue: 'Nothing to export for this chat.',
        }),
      );
      return;
    }

    try {
      const uiMessages = convertMessages(getMessages.data) ?? [];
      const heading = `Chat – ${currentConversation?.title ?? slug}`;
      downloadFullChatMarkdown(uiMessages, {
        conversationTitle: heading,
        filename: `chat-${buildChatMarkdownFilenameBase(currentConversation?.title, slug)}`,
      });
    } catch (error) {
      console.error('Failed to export chat', error);
      toast.error(
        t('chat:export_error_generic', {
          defaultValue: 'Failed to export chat.',
        }),
      );
    }
  };

  useEffect(() => {
    if (
      !slug ||
      !getMessages.data ||
      !getConversation.data ||
      getMessages.data.length !== 0 ||
      isLoading
    ) {
      return;
    }

    clearLegacyPendingChatLocalStorage(slug);

    let cancelled = false;
    const sendAfterAgentReady = window.setTimeout(() => {
      if (cancelled) return;
      const messageToSend = consumeChatBootstrapMessage(slug);
      if (!messageToSend?.trim()) return;

      void agentRef.current?.sendMessage(messageToSend.trim());
      toast.dismiss('creating-conversation');
      toast.dismiss('creating-playground');
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(sendAfterAgentReady);
    };
  }, [getMessages.data, getConversation.data, slug, isLoading]);

  const initialSuggestions = useMemo(() => [...GENERIC_CHAT_SUGGESTIONS], []);

  if (isLoading) {
    return (
      <div className="flex size-full flex-col items-center justify-center gap-4 p-8 text-center">
        <BotAvatar size={12} isLoading={true} />
      </div>
    );
  }

  if (!getMessages.data) {
    if (getMessages.isError) {
      return (
        <div className="flex size-full flex-col items-center justify-center gap-4 p-8 text-center">
          <p className="text-muted-foreground text-sm">
            Failed to load messages for this conversation.
          </p>
          <Button
            variant="outline"
            onClick={() => getMessages.refetch()}
            data-test="conversation-retry-messages"
          >
            Retry
          </Button>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="relative h-full">
      <Agent
        key={slug}
        ref={agentRef}
        conversationSlug={slug as string}
        initialMessages={getMessages.data}
        initialSuggestions={initialSuggestions}
      />
      {currentConversation && (
        <div className="pointer-events-none fixed top-4 right-6 z-40 flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="pointer-events-auto h-9 w-9 rounded-full shadow-sm"
                title={t('sidebar.chatOptions', {
                  defaultValue: 'Chat options',
                })}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="pointer-events-auto min-w-44"
            >
              <DropdownMenuItem onClick={handleRename}>
                <Pencil className="mr-2 h-4 w-4" />
                <span>
                  {t('common:sidebar.rename', { defaultValue: 'Rename' })}
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleToggleBookmark}>
                <Bookmark
                  className={cn('mr-2 h-4 w-4', isBookmarked && 'fill-current')}
                />
                <span>
                  {isBookmarked
                    ? t('common:sidebar.unpin', { defaultValue: 'Unpin chat' })
                    : t('common:sidebar.pinChat', {
                        defaultValue: 'Pin chat',
                      })}
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportChat}>
                <Archive className="mr-2 h-4 w-4" />
                <span>
                  {t('chat:export_chat', { defaultValue: 'Export chat' })}
                </span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                <span>
                  {t('common:sidebar.delete', { defaultValue: 'Delete chat' })}
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
      {notebookId && notebook.data?.slug && (
        <Button
          onClick={handleGoToNotebook}
          variant="outline"
          size="icon"
          className="fixed right-6 bottom-6 z-50 h-12 w-12 rounded-full shadow-lg transition-shadow hover:shadow-xl"
          title="Go to Notebook"
        >
          <FileText className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
}
