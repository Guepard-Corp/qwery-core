import { useGetMessagesByConversationSlug } from '~/lib/queries/use-get-messages';
import { useGetConversationBySlug } from '~/lib/queries/use-get-conversations';
import Agent from '../_components/agent';
import { useParams } from 'react-router';
import { useWorkspace } from '~/lib/context/workspace-context';
import { useEffect, useRef } from 'react';
import type { AgentUIWrapperRef } from '../_components/agent-ui-wrapper';
import { BotAvatar } from '@qwery/ui/bot-avatar';

export default function ConversationPage() {
  const slug = useParams().slug;
  const { repositories } = useWorkspace();
  const agentRef = useRef<AgentUIWrapperRef>(null);
  const hasAutoSentRef = useRef(false);

  const getMessages = useGetMessagesByConversationSlug(
    repositories.conversation,
    repositories.message,
    slug as string,
  );

  const getConversation = useGetConversationBySlug(
    repositories.conversation,
    slug as string,
  );

  // Reset auto-send flag when conversation changes
  useEffect(() => {
    hasAutoSentRef.current = false;
  }, [slug]);

  // Auto-send seedMessage if conversation has no messages but has a seedMessage
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
      // Small delay to ensure the agent is ready
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
    <Agent
      ref={agentRef}
      conversationSlug={slug as string}
      initialMessages={getMessages.data}
    />
  );
}
