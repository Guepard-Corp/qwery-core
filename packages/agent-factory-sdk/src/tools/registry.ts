import { tool, jsonSchema } from 'ai';
import { z } from 'zod/v3';
import type { Tool } from 'ai';
import type { ToolInfo, ToolContext, Model, ToolExecute } from './tool';
import type { AgentInfoWithId } from '../agents/agent';
import { AskAgent, QueryAgent, CompactionAgent, SummaryAgent } from '../agents';
import { TodoWriteTool, TodoReadTool } from './todo';
import { WebFetchTool } from './webfetch';
import { GetSchemaTool } from './get-schema';
import { RunQueryTool } from './run-query';
import { SelectChartTypeTool } from './select-chart-type-tool';
import { GenerateChartTool } from './generate-chart-tool';
import { GetSkillTool } from './get-skill';
import { TaskTool } from './task';
import { getMcpTools } from '../mcp/client.js';

const todowriteInputSchema = jsonSchema<{
  todos: Array<{
    id: string;
    content: string;
    status: string;
    priority: string;
  }>;
}>({
  type: 'object',
  properties: {
    todos: {
      type: 'array',
      description: 'The updated todo list',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          content: { type: 'string' },
          status: {
            type: 'string',
            enum: ['pending', 'in_progress', 'completed', 'cancelled'],
          },
          priority: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
        required: ['id', 'content', 'status', 'priority'],
      },
    },
  },
  required: ['todos'],
});

const tools = new Map<string, ToolInfo>();
const agents = new Map<string, AgentInfoWithId>();

function registerTools() {
  tools.set(TodoWriteTool.id, TodoWriteTool as unknown as ToolInfo);
  tools.set(TodoReadTool.id, TodoReadTool as unknown as ToolInfo);
  tools.set(WebFetchTool.id, WebFetchTool as unknown as ToolInfo);
  //tools.set(TestConnectionTool.id, TestConnectionTool as unknown as ToolInfo);
  tools.set(GetSchemaTool.id, GetSchemaTool as unknown as ToolInfo);
  tools.set(RunQueryTool.id, RunQueryTool as unknown as ToolInfo);
  tools.set(SelectChartTypeTool.id, SelectChartTypeTool as unknown as ToolInfo);
  tools.set(GenerateChartTool.id, GenerateChartTool as unknown as ToolInfo);
  tools.set(GetSkillTool.id, GetSkillTool as unknown as ToolInfo);
  tools.set(TaskTool.id, TaskTool as unknown as ToolInfo);
}

function registerAgents() {
  agents.set(AskAgent.id, AskAgent);
  agents.set(QueryAgent.id, QueryAgent);
  agents.set(CompactionAgent.id, CompactionAgent);
  agents.set(SummaryAgent.id, SummaryAgent);
}

registerTools();
registerAgents();

export type GetContextOptions = {
  toolCallId?: string;
  abortSignal?: AbortSignal;
};

export type ForAgentOptions = {
  mcpServerUrl?: string;
  mcpNamePrefix?: string;
};

export type ForAgentResult = {
  tools: Record<string, Tool>;
  close?: () => Promise<void>;
};

async function resolveTool(
  info: ToolInfo,
  initCtx?: { agent?: { id: string } },
): Promise<{
  id: string;
  description: string;
  parameters: z.ZodType;
  execute: ToolExecute<z.ZodType>;
}> {
  if ('init' in info && typeof info.init === 'function') {
    const result = await info.init(initCtx);
    return { id: info.id, ...result };
  }
  const syncInfo = info as ToolInfo & {
    description: string;
    parameters: z.ZodType;
    execute: ToolExecute<z.ZodType>;
  };
  return {
    id: syncInfo.id,
    description: syncInfo.description,
    parameters: syncInfo.parameters,
    execute: syncInfo.execute,
  };
}

function whenModelMatches(info: ToolInfo, model: Model): boolean {
  const predicate = 'whenModel' in info ? info.whenModel : undefined;
  if (!predicate) return true;
  return predicate(model);
}

export const Registry = {
  tools: {
    register(t: ToolInfo) {
      tools.set(t.id, t);
    },
    list(): ToolInfo[] {
      return Array.from(tools.values());
    },
    get(id: string): ToolInfo | undefined {
      return tools.get(id);
    },
    async forAgent(
      agentId: string,
      model: Model,
      getContext: (options: GetContextOptions) => ToolContext,
      forAgentOptions?: ForAgentOptions,
    ): Promise<ForAgentResult> {
      const agent = agents.get(agentId);
      if (!agent) {
        throw new Error(`Agent not found: ${agentId}`);
      }

      const allTools = Array.from(tools.values());
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
      const byModel = byAgent.filter((t) => whenModelMatches(t, model));

      const result: Record<string, Tool> = {};
      const initCtx = { agent: { id: agentId } };

      for (const info of byModel) {
        const resolved = await resolveTool(info, initCtx);
        const inputSchema =
          resolved.id === 'todowrite'
            ? todowriteInputSchema
            : resolved.parameters;
        result[resolved.id] = tool({
          description: resolved.description,
          inputSchema,
          execute: async (args, options) => {
            resolved.parameters.parse(args);
            const context = getContext({
              toolCallId: options.toolCallId,
              abortSignal: options.abortSignal,
            });
            const raw = await resolved.execute(args, context);
            const toTruncate =
              typeof raw === 'string'
                ? raw
                : typeof raw === 'object' &&
                    raw !== null &&
                    'output' in raw &&
                    Object.keys(raw).length === 1
                  ? (raw as { output: string }).output
                  : null;
            if (toTruncate != null) {
              try {
                const { truncateOutput } = await import('./truncation');
                const truncated = await truncateOutput(toTruncate);
                if (truncated.truncated) {
                  return typeof raw === 'string'
                    ? truncated.content
                    : { output: truncated.content };
                }
              } catch {
                // truncation not available (e.g. browser or Node without fs); return as-is
              }
            }
            if (typeof raw === 'string') return raw;
            if (
              typeof raw === 'object' &&
              raw !== null &&
              'output' in raw &&
              Object.keys(raw).length === 1
            ) {
              return (raw as { output: string }).output;
            }
            return raw as Record<string, unknown>;
          },
        });
      }

      const mcpServerUrl = forAgentOptions?.mcpServerUrl;
      if (mcpServerUrl) {
        const { tools: mcpTools, close } = await getMcpTools(mcpServerUrl, {
          namePrefix: forAgentOptions?.mcpNamePrefix,
        });
        return {
          tools: { ...result, ...mcpTools },
          close,
        };
      }

      return { tools: result };
    },
  },
  agents: {
    register(a: AgentInfoWithId) {
      agents.set(a.id, a);
    },
    list(): AgentInfoWithId[] {
      return Array.from(agents.values());
    },
    get(id: string): AgentInfoWithId | undefined {
      return agents.get(id);
    },
  },
};
