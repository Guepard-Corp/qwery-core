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
import { toast } from 'sonner';
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

  const isLoading = getMessages.isLoading || getConversation.isLoading;

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
      !isLoading
    ) {
      // Check for pending message from dashboard
      const pendingMessageKey = `pending-message-${slug}`;
      const pendingMessage = localStorage.getItem(pendingMessageKey);

      // Use pending message if available, otherwise use seedMessage
      const messageToSend = pendingMessage || getConversation.data.seedMessage;

      if (messageToSend) {
        hasAutoSentRef.current = true;

        // First, set the input field value by finding the textarea in the prompt input
        const setInputValue = () => {
          // Try multiple selectors to find the textarea
          const selectors = [
            'textarea[data-testid*="prompt"]',
            'textarea[placeholder*="message"]',
            'textarea[placeholder*="data"]',
            'textarea[placeholder*="Type"]',
            'textarea[placeholder*="Ask"]',
            'textarea',
          ];

          let textarea: HTMLTextAreaElement | null = null;
          for (const selector of selectors) {
            const found = document.querySelector(
              selector,
            ) as HTMLTextAreaElement;
            if (found && found.offsetParent !== null) {
              textarea = found;
              break;
            }
          }

          if (textarea) {
            // Set the value using React's way
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
              window.HTMLTextAreaElement.prototype,
              'value',
            )?.set;
            if (nativeInputValueSetter) {
              nativeInputValueSetter.call(textarea, messageToSend);
              // Trigger React's onChange handler
              const inputEvent = new Event('input', { bubbles: true });
              textarea.dispatchEvent(inputEvent);
              // Also trigger change event
              const changeEvent = new Event('change', { bubbles: true });
              textarea.dispatchEvent(changeEvent);
            }
            return true;
          }
          return false;
        };

        // Try to set input immediately, retry if needed
        let attempts = 0;
        const maxAttempts = 10;
        const trySetInput = () => {
          if (setInputValue() || attempts >= maxAttempts) {
            // Wait a bit for the input to be set, then send
            setTimeout(() => {
              if (messageToSend) {
                agentRef.current?.sendMessage(messageToSend);

                // Dismiss any pending conversation creation toasts
                toast.dismiss('creating-conversation');
                toast.dismiss('creating-playground');

                // Clear the input field after sending
                setTimeout(() => {
                  const selectors = [
                    'textarea[data-testid*="prompt"]',
                    'textarea[placeholder*="message"]',
                    'textarea[placeholder*="data"]',
                    'textarea[placeholder*="Type"]',
                    'textarea[placeholder*="Ask"]',
                    'textarea',
                  ];

                  for (const selector of selectors) {
                    const textarea = document.querySelector(
                      selector,
                    ) as HTMLTextAreaElement;
                    if (textarea && textarea.offsetParent !== null) {
                      const nativeInputValueSetter =
                        Object.getOwnPropertyDescriptor(
                          window.HTMLTextAreaElement.prototype,
                          'value',
                        )?.set;
                      if (nativeInputValueSetter) {
                        nativeInputValueSetter.call(textarea, '');
                        const inputEvent = new Event('input', {
                          bubbles: true,
                        });
                        textarea.dispatchEvent(inputEvent);
                      }
                      break;
                    }
                  }
                }, 100);

                // Clean up localStorage
                if (pendingMessage) {
                  localStorage.removeItem(pendingMessageKey);
                }
              }
            }, 800);
          } else {
            attempts++;
            setTimeout(trySetInput, 100);
          }
        };

        setTimeout(trySetInput, 200);
      }
    }
  }, [getMessages.data, getConversation.data, slug, isLoading]);

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
