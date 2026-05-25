import { z } from 'zod';
import { generateIdentity } from '../utils/identity.generator';

/**
 * Task — a background subagent invocation. The parent agent spawns a Task
 * via the `agent` tool with `background: true`; the task runs in its own
 * loop (own context, own tools) and the parent polls via `taskStatus`. A
 * Task lives in the process-local registry until the app restarts; if you
 * want cross-restart resume you need a TaskRepository (deferred).
 */
export enum TaskState {
  RUNNING = 'running',
  COMPLETED = 'completed',
  ERROR = 'error',
}

export interface TaskUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens?: number;
}

export const TaskUsageSchema = z.object({
  inputTokens: z.number().int().nonnegative().default(0),
  outputTokens: z.number().int().nonnegative().default(0),
  totalTokens: z.number().int().nonnegative().optional(),
});

export const TaskSchema = z.object({
  id: z.string().min(1).describe('Stable task id returned to the parent agent (e.g. "task_xxx").'),
  sessionId: z.uuid().optional().describe('Session that spawned the task (when applicable).'),
  subagent: z.string().min(1).describe('Subagent display name — slug for persisted, "ad-hoc" otherwise.'),
  prompt: z.string().describe('The user-message-equivalent the subagent received.'),
  state: z.nativeEnum(TaskState),
  text: z.string().optional().describe('Final text reply when state = completed.'),
  error: z.string().optional().describe('Error message when state = error.'),
  usage: TaskUsageSchema.optional(),
  startedAt: z.date(),
  endedAt: z.date().optional(),
});

export type Task = z.infer<typeof TaskSchema>;

export const CreateTaskInputSchema = TaskSchema.pick({
  id: true,
  sessionId: true,
  subagent: true,
  prompt: true,
}).partial({ id: true, sessionId: true });
export type CreateTaskInput = z.infer<typeof CreateTaskInputSchema>;

function generateTaskId(): string {
  const slug = generateIdentity().slug;
  return `task_${slug}`;
}

export function createTask(input: CreateTaskInput): Task {
  return TaskSchema.parse({
    id: input.id ?? generateTaskId(),
    sessionId: input.sessionId,
    subagent: input.subagent,
    prompt: input.prompt,
    state: TaskState.RUNNING,
    startedAt: new Date(),
  });
}

export function completeTask(current: Task, text: string, usage?: TaskUsage): Task {
  return TaskSchema.parse({
    ...current,
    state: TaskState.COMPLETED,
    text,
    usage,
    endedAt: new Date(),
  });
}

export function failTask(current: Task, error: string): Task {
  return TaskSchema.parse({
    ...current,
    state: TaskState.ERROR,
    error,
    endedAt: new Date(),
  });
}
