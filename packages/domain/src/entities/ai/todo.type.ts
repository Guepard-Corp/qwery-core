import { z } from 'zod/v3';

export const TodoItemSchema = z.object({
  id: z.string().describe('Unique identifier for the todo item'),
  content: z.string().describe('Brief description of the task'),
  status: z
    .enum(['pending', 'in_progress', 'completed', 'cancelled'])
    .describe(
      'Current status of the task: pending, in_progress, completed, cancelled',
    ),
  priority: z
    .enum(['high', 'medium', 'low'])
    .describe('Priority level of the task: high, medium, low'),
});

export type TodoItem = z.infer<typeof TodoItemSchema>;

export const TodoSchema = z.array(TodoItemSchema);

export type Todo = z.infer<typeof TodoSchema>;
