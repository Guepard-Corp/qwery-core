import { UIMessage } from 'ai';
import { ChatStatus } from 'ai';
import { isChatStreaming } from './utils/chat-status';
import { memo } from 'react';
import { normalizeUIRole } from '@qwery/shared/message-role-utils';
import {
  TaskPart,
  TextPart,
  ReasoningPart,
  ToolPart,
  TodoPart,
  SourcesPart,
  TaskUIPart,
} from './message-parts';
import { ToolUIPart as AIToolUIPart } from 'ai';
import { getLastTodoPartIndex } from './utils/todo-parts';

export interface MessageRendererProps {
  message: UIMessage;
  messages: UIMessage[];
  status: ChatStatus | undefined;
  onRegenerate?: () => void;
  sendMessage?: ReturnType<
    typeof import('@ai-sdk/react').useChat
  >['sendMessage'];
  onDatasourceNameClick?: (id: string, name: string) => void;
  getDatasourceTooltip?: (id: string) => string;
}

function MessageRendererComponent({
  message,
  messages,
  status,
  onRegenerate,
  sendMessage,
  onDatasourceNameClick,
  getDatasourceTooltip,
}: MessageRendererProps) {
  const isLastMessage = message.id === messages.at(-1)?.id;
  const sourceParts = message.parts.filter(
    (part: { type: string }) => part.type === 'source-url',
  ) as Array<{ type: 'source-url'; sourceId: string; url?: string }>;

  const hasSources =
    (normalizeUIRole(message.role) === 'assistant' ||
      normalizeUIRole(message.role) === 'user') &&
    sourceParts.length > 0;

  const lastTodoIndex = getLastTodoPartIndex(message.parts);

  return (
    <div key={message.id}>
      {hasSources && <SourcesPart parts={sourceParts} messageId={message.id} />}
      {lastTodoIndex !== null && (
        <TodoPart
          key={`${message.id}-todo`}
          part={
            message.parts[lastTodoIndex] as AIToolUIPart & {
              type: 'tool-todowrite' | 'tool-todoread';
            }
          }
          messageId={message.id}
          index={lastTodoIndex}
        />
      )}
      {message.parts.map((part, i: number) => {
        if (part.type === 'tool-todowrite' || part.type === 'tool-todoread') {
          return null;
        }
        if (part.type === 'data-tasks') {
          const taskPart = part as TaskUIPart;
          return (
            <TaskPart
              key={`${message.id}-${taskPart.id}-${i}`}
              part={taskPart}
              messageId={message.id}
              index={i}
            />
          );
        }

        switch (part.type) {
          case 'text':
            return (
              <TextPart
                key={`${message.id}-${i}`}
                part={part as { type: 'text'; text: string }}
                messageId={message.id}
                messageRole={message.role}
                index={i}
                isLastMessage={isLastMessage && i === message.parts.length - 1}
                onRegenerate={onRegenerate}
                sendMessage={sendMessage}
                messages={messages}
                onDatasourceNameClick={onDatasourceNameClick}
                getDatasourceTooltip={getDatasourceTooltip}
              />
            );
          case 'reasoning':
            return (
              <ReasoningPart
                key={`${message.id}-${i}`}
                part={part as { type: 'reasoning'; text: string }}
                messageId={message.id}
                index={i}
                isStreaming={
                  isChatStreaming(status) &&
                  i === message.parts.length - 1 &&
                  message.id === messages.at(-1)?.id
                }
                sendMessage={sendMessage}
                messages={messages}
                onDatasourceNameClick={onDatasourceNameClick}
                getDatasourceTooltip={getDatasourceTooltip}
              />
            );
          default:
            if (part.type.startsWith('tool-')) {
              const toolPart = part as AIToolUIPart;
              return (
                <ToolPart
                  key={`${message.id}-${i}`}
                  part={toolPart}
                  messageId={message.id}
                  index={i}
                />
              );
            }
            return null;
        }
      })}
    </div>
  );
}

export const MessageRenderer = memo(MessageRendererComponent, (prev, next) => {
  if (prev.message.id !== next.message.id) {
    return false;
  }

  if (prev.message.parts.length !== next.message.parts.length) {
    return false;
  }

  if (prev.status !== next.status) {
    return false;
  }

  const isLastMessage = prev.message.id === prev.messages.at(-1)?.id;
  if (
    isLastMessage &&
    (isChatStreaming(prev.status) || isChatStreaming(next.status))
  ) {
    return false;
  }

  if (prev.messages.length !== next.messages.length) {
    const messageStillExists = next.messages.some(
      (m) => m.id === prev.message.id,
    );
    if (!messageStillExists) {
      return false;
    }
    if (isLastMessage) {
      return false;
    }
  }

  return true;
});
