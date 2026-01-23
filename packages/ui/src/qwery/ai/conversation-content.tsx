import { UIMessage } from 'ai';
import { ChatStatus } from 'ai';
import { isChatSubmitted } from './utils/chat-status';
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
  sendMessage?: ReturnType<
    typeof import('@ai-sdk/react').useChat
  >['sendMessage'];
}

export function QweryConversationContent({
  messages,
  status,
  onRegenerate,
  sendMessage,
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
            sendMessage={sendMessage}
          />
        ))}
        {isChatSubmitted(status) && <Loader />}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}
