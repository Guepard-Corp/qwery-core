import { UIMessage } from 'ai';
import { ChatStatus } from 'ai';
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
}

export function MessageRenderer({
  message,
  messages,
  status,
  onRegenerate,
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
                  status === 'streaming' &&
                  i === message.parts.length - 1 &&
                  message.id === messages.at(-1)?.id
                }
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
