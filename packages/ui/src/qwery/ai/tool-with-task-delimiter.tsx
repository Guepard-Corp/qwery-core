import { getTaskDelimiterForToolPart } from './utils/todo-logic';
import { TaskDelimiter } from './task-delimiter';
import { ToolPart, type ToolPartProps } from './message-parts';

export type ToolWithTaskDelimiterProps = ToolPartProps & {
  parts: Array<{ type: string }>;
  partIndex: number;
};

export function ToolWithTaskDelimiter({
  parts,
  partIndex,
  messageId,
  ...toolPartProps
}: ToolWithTaskDelimiterProps) {
  const task = getTaskDelimiterForToolPart(parts, partIndex);
  return (
    <>
      {task && (
        <TaskDelimiter
          taskIndex={task.taskIndex}
          taskTitle={task.taskTitle}
          todos={task.todos}
          status="started"
          messageId={messageId}
        />
      )}
      <ToolPart {...toolPartProps} messageId={messageId} />
    </>
  );
}
