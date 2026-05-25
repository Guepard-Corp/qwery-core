import { z } from 'zod';
import { generateIdentity } from '../utils/identity.generator';

/**
 * Todo — a single planned step inside a session. The agent maintains a list
 * of todos via `todoWrite` / `todoRead` to track multi-step work. Todos are
 * session-scoped (`sessionId`) and intentionally lightweight: no assignee,
 * no due date, no description body. Status + priority are enough for the
 * agent loop's coordination needs.
 */
export enum TodoStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum TodoPriority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export const TodoSchema = z.object({
  id: z.string().min(1).describe('Stable identifier (any unique short string).'),
  sessionId: z.uuid().describe('Session this todo belongs to.'),
  content: z.string().min(1).max(1024).describe('Concise actionable task description.'),
  status: z.nativeEnum(TodoStatus).describe('Current status; keep at most ONE in_progress at a time.'),
  priority: z.nativeEnum(TodoPriority).describe('Priority for ordering.'),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Todo = z.infer<typeof TodoSchema>;

export const CreateTodoInputSchema = TodoSchema.pick({
  id: true,
  sessionId: true,
  content: true,
  status: true,
  priority: true,
}).partial({ id: true });
export type CreateTodoInput = z.infer<typeof CreateTodoInputSchema>;

export const UpdateTodoInputSchema = TodoSchema.pick({
  content: true,
  status: true,
  priority: true,
}).partial();
export type UpdateTodoInput = z.infer<typeof UpdateTodoInputSchema>;

export function createTodo(input: CreateTodoInput): Todo {
  const now = new Date();
  const id = input.id ?? generateIdentity().slug;
  return TodoSchema.parse({
    id,
    sessionId: input.sessionId,
    content: input.content,
    status: input.status,
    priority: input.priority,
    createdAt: now,
    updatedAt: now,
  });
}

export function updateTodo(current: Todo, input: UpdateTodoInput): Todo {
  return TodoSchema.parse({
    ...current,
    ...(input.content !== undefined && { content: input.content }),
    ...(input.status !== undefined && { status: input.status }),
    ...(input.priority !== undefined && { priority: input.priority }),
    updatedAt: new Date(),
  });
}
