import { tool } from 'ai';
import { z } from 'zod/v3';
import type { Tool } from 'ai';
import type { ToolInfo, ToolContext, Model, ToolExecute } from './tool';
import type { AgentInfoWithId } from '../agents/agent';
import { AskAgent } from '../agents/ask-agent';
import { QueryAgent } from '../agents/query-agent';
import { TodoWriteTool, TodoReadTool } from './todo';
import { WebFetchTool } from './webfetch';
import { GetSchemaTool } from './get-schema';
import { RunQueryTool } from './run-query';
import { SelectChartTypeTool } from './select-chart-type-tool';
import { GenerateChartTool } from './generate-chart-tool';

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
}

function registerAgents() {
  agents.set(AskAgent.id, AskAgent);
  agents.set(QueryAgent.id, QueryAgent);
}

registerTools();
registerAgents();

export type GetContextOptions = {
  toolCallId?: string;
  abortSignal?: AbortSignal;
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
    ): Promise<Record<string, Tool>> {
      const agent = agents.get(agentId);
      if (!agent) {
        throw new Error(`Agent not found: ${agentId}`);
      }

      const allTools = Array.from(tools.values());
      const toolIds = agent.options?.toolIds as string[] | undefined;
      const byAgent = toolIds?.length
        ? allTools.filter((t) => toolIds.includes(t.id))
        : allTools;
      const byModel = byAgent.filter((t) => whenModelMatches(t, model));

      const result: Record<string, Tool> = {};
      const initCtx = { agent: { id: agentId } };

      for (const info of byModel) {
        const resolved = await resolveTool(info, initCtx);
        result[resolved.id] = tool({
          description: resolved.description,
          inputSchema: resolved.parameters,
          execute: async (args, options) => {
            resolved.parameters.parse(args);
            const context = getContext({
              toolCallId: options.toolCallId,
              abortSignal: options.abortSignal,
            });
            const output = await resolved.execute(args, context);
            if (typeof output === 'string') return output;
            if (
              typeof output === 'object' &&
              output !== null &&
              'output' in output &&
              Object.keys(output).length === 1
            ) {
              return (output as { output: string }).output;
            }
            return output as Record<string, unknown>;
          },
        });
      }

      return result;
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
