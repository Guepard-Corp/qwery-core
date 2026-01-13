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
import { FileText } from 'lucide-react';
import pathsConfig from '~/config/paths.config';
import { createPath } from '~/config/paths.config';

export default function ConversationPage() {
  const slug = useParams().slug;
  const navigate = useNavigate();
  const { repositories } = useWorkspace();
  const agentRef = useRef<AgentUIWrapperRef>(null);
  const hasAutoSentRef = useRef(false);

  const getMessages = useGetMessagesByConversationSlug(
    repositories.conversation,
    repositories.message,
    slug as string,
    {
      refetchInterval: 2000,
    },
  );

  const getConversation = useGetConversationBySlug(
    repositories.conversation,
    slug as string,
  );

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

  useEffect(() => {
    hasAutoSentRef.current = false;
  }, [slug]);

  useEffect(() => {
    if (
      !hasAutoSentRef.current &&
      getMessages.data &&
      getConversation.data &&
      getMessages.data.length === 0 &&
      getConversation.data.seedMessage
    ) {
      hasAutoSentRef.current = true;
      const seedMessage = getConversation.data.seedMessage;
      setTimeout(() => {
        if (seedMessage) {
          agentRef.current?.sendMessage(seedMessage);
        }
      }, 100);
    }
  }, [getMessages.data, getConversation.data, slug]);

  const isLoading = getMessages.isLoading || getConversation.isLoading;

  if (isLoading) {
    return (
      <div className="flex size-full flex-col items-center justify-center gap-4 p-8 text-center">
        <BotAvatar size={12} isLoading={true} />
        <div className="space-y-1">
          <h3 className="text-sm font-medium">Loading conversation...</h3>
          <p className="text-muted-foreground text-sm">
            Please wait while we load your messages
          </p>
        </div>
      </div>
    );
  }

  if (!getMessages.data) {
    return null;
  }

  return (
    <div className="relative h-full">
      <Agent
        ref={agentRef}
        conversationSlug={slug as string}
        initialMessages={getMessages.data}
      />
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
