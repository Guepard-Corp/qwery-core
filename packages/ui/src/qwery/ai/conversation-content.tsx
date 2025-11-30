import { UIMessage } from 'ai';
import { ChatStatus } from 'ai';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '../../ai-elements/conversation';
import { Loader } from '../../ai-elements/loader';
import { MessageRenderer } from './message-renderer';

export interface ConversationContentProps {
  messages: UIMessage[];
  status: ChatStatus | undefined;
  onRegenerate?: () => void;
}

export function QweryConversationContent({
  messages,
  status,
  onRegenerate,
}: ConversationContentProps) {
  return (
    <Conversation>
      <ConversationContent>
        {messages.map((message) => (
          <MessageRenderer
            key={message.id}
            message={message}
            messages={messages}
            status={status}
            onRegenerate={onRegenerate}
          />
        ))}
        {status === 'submitted' && <Loader />}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}
