import { UIMessage } from 'ai';
import { ChatStatus } from 'ai';
import { isChatStreaming } from './utils/chat-status';
import { memo } from 'react';
import {
  TaskPart,
  TextPart,
  ReasoningPart,
  ToolPart,
  SourcesPart,
  TaskUIPart,
} from './message-parts';
import { ToolUIPart as AIToolUIPart } from 'ai';

export interface MessageRendererProps {
  message: UIMessage;
  messages: UIMessage[];
  status: ChatStatus | undefined;
  onRegenerate?: () => void;
  sendMessage?: ReturnType<
    typeof import('@ai-sdk/react').useChat
  >['sendMessage'];
}

function MessageRendererComponent({
  message,
  messages,
  status,
  onRegenerate,
  sendMessage,
}: MessageRendererProps) {
  const isLastMessage = message.id === messages.at(-1)?.id;
  const sourceParts = message.parts.filter(
    (part: { type: string }) => part.type === 'source-url',
  ) as Array<{ type: 'source-url'; sourceId: string; url?: string }>;

  const hasSources =
    (message.role === 'assistant' || message.role === 'user') &&
    sourceParts.length > 0;

  return (
    <div key={message.id}>
      {hasSources && <SourcesPart parts={sourceParts} messageId={message.id} />}
      {message.parts.map((part, i: number) => {
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

// Memoize MessageRenderer to prevent unnecessary re-renders
// Only re-render if message content, parts count, or status changes
export const MessageRenderer = memo(MessageRendererComponent, (prev, next) => {
  // Re-render if message ID changed (different message)
  if (prev.message.id !== next.message.id) {
    return false;
  }

  // Re-render if message parts count changed
  if (prev.message.parts.length !== next.message.parts.length) {
    return false;
  }

  // Re-render if status changed (affects streaming indicators)
  if (prev.status !== next.status) {
    return false;
  }

  // Re-render if message is the last message and status is streaming
  // (for streaming indicators)
  const isLastMessage = prev.message.id === prev.messages.at(-1)?.id;
  if (
    isLastMessage &&
    (isChatStreaming(prev.status) || isChatStreaming(next.status))
  ) {
    return false;
  }

  // Re-render if messages array reference changed (might indicate new messages)
  // But only if this message is affected
  if (prev.messages.length !== next.messages.length) {
    // Check if this message is still in the array
    const messageStillExists = next.messages.some(
      (m) => m.id === prev.message.id,
    );
    if (!messageStillExists) {
      return false;
    }
    // If it's the last message and array length changed, might be new message added
    if (isLastMessage) {
      return false;
    }
  }

  // Don't re-render if nothing relevant changed
  return true;
});
