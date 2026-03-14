export type ParsedTodo = {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: string;
};

export function isToolPart(p: { type: string }): boolean {
  return p.type.startsWith('tool-');
}

function isTodoPart(p: { type: string }): boolean {
  return p.type === 'tool-todowrite' || p.type === 'tool-todoread';
}

function getLastTodoPartIndexBefore(
  parts: Array<{ type: string }>,
  beforeIndex: number,
): number | null {
  let last: number | null = null;
  for (let i = 0; i < beforeIndex; i++) {
    const part = parts[i];
    if (part && isTodoPart(part)) {
      last = i;
    }
  }
  return last;
}

export function parseTodosFromPart(part: {
  type: string;
  input?: unknown;
  output?: unknown;
}): ParsedTodo[] {
  if (part.type === 'tool-todowrite') {
    const input = part.input as { todos?: ParsedTodo[] } | null;
    const todos = input?.todos;
    return Array.isArray(todos) ? todos : [];
  }
  if (part.type === 'tool-todoread') {
    const output = part.output;
    if (output == null) return [];
    if (Array.isArray(output)) return output as ParsedTodo[];
    if (typeof output === 'string') {
      try {
        const parsed = JSON.parse(output) as ParsedTodo[] | unknown;
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    if (typeof output === 'object' && output !== null && 'todos' in output) {
      const todos = (output as { todos: ParsedTodo[] }).todos;
      return Array.isArray(todos) ? todos : [];
    }
  }
  return [];
}

export type TaskDelimiterInfo = {
  taskIndex: number;
  taskTitle: string;
  todos: ParsedTodo[];
};

/**
 * Returns task info for a delimiter to show before a tool part, or null.
 * When there is an in_progress task, shows delimiter only before the first tool
 * after that todowrite. When all tasks are completed, infers the task from
 * tool position (Nth tool = Nth task).
 */
export function getTaskDelimiterForToolPart(
  parts: Array<{ type: string }>,
  toolPartIndex: number,
): TaskDelimiterInfo | null {
  const lastTodoIdx = getLastTodoPartIndexBefore(parts, toolPartIndex);
  if (lastTodoIdx === null) return null;

  const todoPart = parts[lastTodoIdx];
  if (!todoPart || !isTodoPart(todoPart)) return null;

  const todos = parseTodosFromPart(
    todoPart as { type: string; input?: unknown; output?: unknown },
  );
  const toolsBetween = parts
    .slice(lastTodoIdx + 1, toolPartIndex)
    .filter(isToolPart);
  const taskIndexAmongTools = toolsBetween.length;

  const inProgressTasks = todos.filter((t) => t.status === 'in_progress');
  if (inProgressTasks.length > 1 && process.env.NODE_ENV !== 'production') {
    console.warn('Multiple in_progress tasks detected.');
  }

  let task = inProgressTasks[0] ?? null;
  if (task) {
    const hasOtherToolBetween = toolsBetween.length > 0;
    if (hasOtherToolBetween) return null;
  } else {
    task = todos[taskIndexAmongTools] ?? null;
  }
  if (!task) return null;

  const displayIndex = todos.findIndex((t) => t.id === task!.id) + 1;
  return {
    taskIndex: displayIndex > 0 ? displayIndex : 1,
    taskTitle: task.content || 'Task',
    todos,
  };
}
