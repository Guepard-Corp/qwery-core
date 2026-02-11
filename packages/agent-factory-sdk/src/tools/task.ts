import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import type { UIMessage } from 'ai';
import { Tool } from './tool';
import { Registry } from './registry';
import { TaskPrompt } from './prompts/task.prompt';
import { runAgentToCompletion } from '../agents/run-agent-to-completion';
import { createMessages, type Message } from '../llm/message';
import type { Repositories } from '@qwery/domain/repositories';
import { messageRoleToUIRole } from '@qwery/shared/message-role-utils';

const parameters = z.object({
  description: z
    .string()
    .describe('A short (3-5 words) description of the task'),
  prompt: z.string().describe('The task for the agent to perform'),
  subagent_type: z
    .string()
    .describe('The type of specialized agent to use for this task'),
  session_id: z
    .string()
    .optional()
    .describe('Existing Task session to continue'),
  command: z
    .string()
    .optional()
    .describe('The command that triggered this task'),
});

type TaskParams = z.infer<typeof parameters>;

export const TaskTool = Tool.define('task', {
  whenModel: () => true,
  init: async (ctx) => {
    const all = Registry.agents.list();
    const currentAgentId = ctx?.agent?.id;
    const accessible = all.filter(
      (a) =>
        a.hidden !== true &&
        (a.mode === 'subagent' ||
          a.mode === 'all' ||
          (a.mode === 'main' && a.id !== currentAgentId)),
    );
    const description = TaskPrompt(accessible);
    return {
      description,
      parameters,
      execute: async (params: TaskParams, execCtx) => {
        const repositories = execCtx.extra?.repositories as
          | Repositories
          | undefined;
        if (!repositories) {
          return {
            output: 'Task tool is not available: repositories not provided.',
          };
        }

        if (
          execCtx.ask &&
          !(execCtx.extra?.bypassAgentCheck as boolean | undefined)
        ) {
          await execCtx.ask({
            permission: 'task',
            patterns: [params.subagent_type],
            always: ['*'],
            metadata: {
              description: params.description,
              subagent_type: params.subagent_type,
            },
          });
        }

        const agent = Registry.agents.get(params.subagent_type);
        if (!agent) {
          return {
            output: `Unknown agent type: ${params.subagent_type} is not a valid agent type`,
          };
        }

        let taskConversationId: string;
        let taskConversationSlug: string;
        let messages: UIMessage[];

        if (params.session_id) {
          const existing = await repositories.conversation.findById(
            params.session_id,
          );
          if (!existing) {
            return {
              output: `Task session not found: ${params.session_id}. Start a new task without session_id.`,
            };
          }
          taskConversationId = existing.id;
          taskConversationSlug = existing.slug;

          const messagesApi = createMessages({
            messageRepository: repositories.message,
          });
          const historyMessages: Message[] = [];
          for await (const m of messagesApi.stream(taskConversationId)) {
            historyMessages.push(m);
          }
          const historyReversed = [...historyMessages].reverse();
          const historyAsUIMessage = historyReversed.map((m) => ({
            id: m.id,
            role: messageRoleToUIRole(m.role),
            parts: m.content?.parts ?? [],
          })) as UIMessage[];
          const newUserMessage: UIMessage = {
            id: uuidv4(),
            role: 'user',
            parts: [{ type: 'text', text: params.prompt }],
          };
          messages = [...historyAsUIMessage, newUserMessage];
        } else {
          const parent = await repositories.conversation.findById(
            execCtx.conversationId,
          );
          if (!parent) {
            return {
              output:
                'Task tool could not load parent conversation. Conversation not found.',
            };
          }

          const now = new Date();
          const child = await repositories.conversation.create({
            id: uuidv4(),
            slug: '',
            title: `Task: ${params.description} (@${agent.name})`,
            seedMessage: params.prompt,
            projectId: parent.projectId,
            taskId: parent.taskId,
            datasources: parent.datasources?.length
              ? parent.datasources
              : ((parent as { datasources?: string[] }).datasources ?? []),
            createdAt: now,
            updatedAt: now,
            createdBy: parent.createdBy ?? 'system',
            updatedBy: parent.updatedBy ?? parent.createdBy ?? 'system',
            isPublic: false,
          });
          taskConversationId = child.id;
          taskConversationSlug = child.slug;
          messages = [
            {
              id: uuidv4(),
              role: 'user',
              parts: [{ type: 'text', text: params.prompt }],
            },
          ];
        }

        execCtx.metadata?.({
          title: params.description,
          metadata: {
            sessionId: taskConversationId,
          },
        });

        const result = await runAgentToCompletion({
          conversationId: taskConversationId,
          conversationSlug: taskConversationSlug,
          messages,
          agentId: params.subagent_type,
          model: (execCtx.extra?.model as string) ?? undefined,
          repositories,
          abortSignal: execCtx.abort,
          maxSteps: agent.steps ?? 5,
          datasources: execCtx.extra?.metadataDatasources as
            | string[]
            | undefined,
          onAsk: execCtx.ask
            ? async (req) => {
                await execCtx.ask!(req);
              }
            : undefined,
          onToolMetadata: execCtx.metadata
            ? (input) => {
                void execCtx.metadata?.(input);
              }
            : undefined,
        });

        const output =
          result.text +
          '\n\n<task_metadata>\nsession_id: ' +
          taskConversationId +
          '\n</task_metadata>';

        return { output };
      },
    };
  },
});
