import { z } from 'zod';
import type { Repositories } from '@qwery/domain/repositories';
import {
  CreateOrUpdateTodoService,
  GetTodoByConversationService,
} from '@qwery/domain/services';
import { Tool } from './tool';
import { TodoWritePrompt } from './prompts/todowrite.prompt';
import { TODOREAD_DESCRIPTION } from './prompts/todoread.prompt';
import { Registry } from './registry';

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

const parameters = z.object({
  todos: z.array(TodoItemSchemaForTool).describe('The updated todo list'),
});

export const TodoWriteTool = Tool.define('todowrite', {
  whenModel: () => true,
  init: async (ctx) => {
    const agentId = ctx?.agent?.id;
    if (!agentId) {
      throw new Error('Agent ID is required for TodoWriteTool');
    }

    const agent = Registry.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    const allTools = Registry.tools.list();
    const options = agent.options ?? {};
    const toolsMap = options.tools as Record<string, boolean> | undefined;
    const toolIds = options.toolIds as string[] | undefined;
    const toolDenylist = options.toolDenylist as string[] | undefined;

    let allowlist: string[] | undefined;
    if (toolsMap && toolsMap['*'] === false) {
      allowlist = Object.entries(toolsMap)
        .filter(([k, v]) => k !== '*' && v === true)
        .map(([k]) => k);
    } else if (toolIds?.length) {
      allowlist = toolIds;
    }

    let byAgent =
      allowlist != null
        ? allTools.filter((t) => allowlist!.includes(t.id))
        : allTools;
    if (toolDenylist?.length) {
      byAgent = byAgent.filter((t) => !toolDenylist.includes(t.id));
    }

    // Filter out meta-tools (todowrite and todoread)
    const availableTools = byAgent.filter(
      (t) => t.id !== 'todowrite' && t.id !== 'todoread',
    );

    const description = TodoWritePrompt(availableTools);

    return {
      description,
      parameters,
      execute: async (params: z.infer<typeof parameters>, execCtx) => {
        const repositories = getRepositories(execCtx);
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
          conversationId: execCtx.conversationId,
          todos: params.todos,
        });

        return {
          output: JSON.stringify(todos, null, 2),
        };
      },
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
