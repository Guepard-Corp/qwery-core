import { createTodo, type Todo, type TodoPriority, type TodoStatus } from '@qwery/domain';
import { type Tool, tool } from 'ai';
import { z } from 'zod';

type AnyTool = Tool;

/**
 * In-memory todo store keyed by session id. Two always-active tools wrap it:
 *   - `todoWrite` replaces the list for the current session.
 *   - `todoRead` returns the current list.
 * No persistence at restart yet — todos are best-effort plan tracking,
 * regeneratable from the conversation. Lift to a repository when the value
 * of cross-restart todos becomes obvious.
 */

export interface TodoStore {
  read(sessionId: string): Todo[];
  write(sessionId: string, todos: Todo[]): void;
  subscribe(listener: (sessionId: string, todos: Todo[]) => void): () => void;
}

export function createTodoStore(): TodoStore {
  const map = new Map<string, Todo[]>();
  const listeners = new Set<(sessionId: string, todos: Todo[]) => void>();
  return {
    read(sessionId) {
      return map.get(sessionId) ?? [];
    },
    write(sessionId, todos) {
      map.set(sessionId, todos);
      for (const l of listeners) l(sessionId, todos);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

const TodoItemSchema = z.object({
  id: z.string().min(1).describe('Stable identifier (any unique short string).'),
  content: z.string().min(1).describe('Concise actionable task description.'),
  status: z
    .enum(['pending', 'in_progress', 'completed', 'cancelled'])
    .describe('Current status. Keep at most ONE `in_progress` at any time.'),
  priority: z.enum(['high', 'medium', 'low']).describe('Priority for ordering.'),
});

export interface TodoToolDeps {
  store: TodoStore;
  /** Current session id — the tool ties writes to this session. */
  sessionId: string;
  /** Notified after each write (used by the UI to refresh). */
  onChange?: (todos: Todo[]) => void;
}

export function buildTodoTools(deps: TodoToolDeps): { todoWrite: AnyTool; todoRead: AnyTool } {
  return {
    todoWrite: tool({
      description: [
        'Maintain a structured todo list for the current session. Use proactively when a user request',
        'has 3+ distinct steps, when the user gives multiple tasks, or when you need to track progress.',
        'Replace the WHOLE list every call (idempotent). Keep at most ONE item in `in_progress`. Mark',
        '`completed` ONLY after the work is actually done. Skip this tool for single trivial tasks.',
      ].join(' '),
      inputSchema: z.object({
        todos: z.array(TodoItemSchema).describe('The full updated todo list.'),
      }),
      execute: async ({ todos }) => {
        const normalized: Todo[] = todos.map((t) =>
          createTodo({
            id: t.id,
            sessionId: deps.sessionId,
            content: t.content,
            status: t.status as TodoStatus,
            priority: t.priority as TodoPriority,
          }),
        );
        deps.store.write(deps.sessionId, normalized);
        deps.onChange?.(normalized);
        const counts = normalized.reduce<Record<string, number>>((acc, t) => {
          acc[t.status] = (acc[t.status] ?? 0) + 1;
          return acc;
        }, {});
        return {
          ok: true as const,
          count: normalized.length,
          counts,
          todos: normalized,
        };
      },
    }),

    todoRead: tool({
      description:
        'Read the current session todo list. Returns the list as-stored, in declaration order. Call this before deciding next actions if you have lost track of progress.',
      inputSchema: z.object({}),
      execute: async () => {
        const todos = deps.store.read(deps.sessionId);
        return { ok: true as const, count: todos.length, todos };
      },
    }),
  };
}
