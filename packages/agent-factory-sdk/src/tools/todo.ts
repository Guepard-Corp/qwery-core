import { z } from 'zod';
import type { Repositories } from '@qwery/domain/repositories';
import {
  CreateOrUpdateTodoService,
  GetTodoByConversationService,
} from '@qwery/domain/services';
import { Tool } from './tool';
import { TODOWRITE_DESCRIPTION } from './prompts/todowrite.prompt';
import { TODOREAD_DESCRIPTION } from './prompts/todoread.prompt';

const TodoItemSchemaForTool = z.object({
  id: z.string(),
  content: z.string(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']),
  priority: z.enum(['high', 'medium', 'low']),
});

function getRepositories(ctx: {
  extra?: Record<string, unknown>;
}): Repositories | null {
  const repos = ctx.extra?.repositories;
  return (repos as Repositories) ?? null;
}

export const TodoWriteTool = Tool.define('todowrite', {
  description: TODOWRITE_DESCRIPTION,
  parameters: z.object({
    todos: z.array(TodoItemSchemaForTool).describe('The updated todo list'),
  }),
  async execute(params, ctx) {
    const repositories = getRepositories(ctx);
    if (!repositories) {
      return {
        output: 'Todo tool is not available: repositories not provided.',
      };
    }

    const service = new CreateOrUpdateTodoService(
      repositories.todo,
      repositories.conversation,
    );

    const todos = await service.execute({
      conversationId: ctx.conversationId,
      todos: params.todos,
    });

    return {
      output: JSON.stringify(todos, null, 2),
    };
  },
});

export const TodoReadTool = Tool.define('todoread', {
  description: TODOREAD_DESCRIPTION,
  parameters: z.object({}),
  async execute(_params, ctx) {
    const repositories = getRepositories(ctx);
    if (!repositories) {
      return {
        output: 'Todo tool is not available: repositories not provided.',
      };
    }

    const service = new GetTodoByConversationService(
      repositories.todo,
      repositories.conversation,
    );

    const todos = await service.execute({
      conversationId: ctx.conversationId,
    });

    return {
      output: JSON.stringify(todos, null, 2),
    };
  },
});
