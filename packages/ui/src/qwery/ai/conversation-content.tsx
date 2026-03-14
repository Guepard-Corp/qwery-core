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
  onDatasourceNameClick?: (id: string, name: string) => void;
  onTableNameClick?: (
    datasourceId: string,
    datasourceName: string,
    schema: string,
    tableName: string,
  ) => void;
  getDatasourceTooltip?: (id: string) => string;
}

export function QweryConversationContent({
  messages,
  status,
  onRegenerate,
  sendMessage,
  onDatasourceNameClick,
  onTableNameClick,
  getDatasourceTooltip,
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
            onDatasourceNameClick={onDatasourceNameClick}
            onTableNameClick={onTableNameClick}
            getDatasourceTooltip={getDatasourceTooltip}
          />
        ))}
        {isChatSubmitted(status) && <Loader />}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}
