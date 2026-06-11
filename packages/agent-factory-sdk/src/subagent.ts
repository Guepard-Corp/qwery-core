import type { Compute, LLMProvider, Logger, ToolName } from '@qwery/domain';
import { type ModelMessage, type Tool, tool } from 'ai';
import { z } from 'zod';
import { type AgentSpec, CodingAgentSpec, DataAgentSpec } from './agent-spec';
import type {
  AgentRunOptions,
  AgentRunResult,
  SubagentBase,
  SubagentRunEvent,
  SubagentRunInfo,
} from './agent-types';
import type { BackgroundJobRegistry } from './background-jobs';
import type { AttachedDatasourceSummary, LocalAppSummary, SkillSummary } from './system-prompt';
import type { ToolRegistryDeps } from './tool-registry';

type AnyTool = Tool;

export type { SubagentBase, SubagentRunEvent as SubagentEvent, SubagentRunInfo as SubagentDescriptor };

/**
 * `taskStatus` tool — peeks (or waits) on a background subagent job. The
 * parent agent typically launches a subagent with `background: true`, keeps
 * working, then calls `taskStatus({ task_id })` later. With `wait: true`, the
 * tool blocks up to `timeout_ms` (default 60s) until the job is in a terminal
 * state, which is useful when the parent has nothing left to do but the
 * subagent result.
 */
export function buildTaskStatusTool(jobs: BackgroundJobRegistry): AnyTool {
  return tool({
    description:
      'Inspect a background subagent task. Returns `{ state, text }` (or just `state` if running). Use `wait: true` to block until the job is terminal (use sparingly — it stalls your loop).',
    inputSchema: z.object({
      task_id: z.string().describe('The task_id returned by `agent({ background: true })`.'),
      wait: z.boolean().optional().describe('Block until terminal (default false).'),
      timeout_ms: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Max ms to wait when `wait: true` (default 60000).'),
    }),
    execute: async ({ task_id: taskId, wait, timeout_ms: timeoutMs }) => {
      const pollMs = 300;
      const deadline = Date.now() + (timeoutMs ?? 60_000);
      while (true) {
        const job = jobs.get(taskId);
        if (!job) return { ok: false as const, error: `Unknown task_id "${taskId}".` };
        if (job.state !== 'running' || !wait || Date.now() >= deadline) {
          return {
            ok: true as const,
            task_id: taskId,
            state: job.state,
            subagent: job.subagent,
            text: job.text,
            error: job.error,
            usage: job.usage,
            startedAt: job.startedAt,
            endedAt: job.endedAt,
          };
        }
        await new Promise((r) => setTimeout(r, pollMs));
      }
    },
  });
}

export interface AgentToolDeps {
  /** Forward ref to `runAgent` — passed in to avoid cyclic imports. */
  runAgent: (opts: AgentRunOptions) => Promise<AgentRunResult>;
  compute: Compute;
  llm: LLMProvider;
  logger: Logger;
  /** Same contextual deps the parent agent uses, propagated to the subagent. */
  datasources?: AttachedDatasourceSummary[];
  apps?: LocalAppSummary[];
  skills?: SkillSummary[];
  registry?: ToolRegistryDeps;
  /** Optional background-job registry — required for `background: true`. */
  backgroundJobs?: BackgroundJobRegistry;
}

const BASE_SPEC: Record<SubagentBase, AgentSpec> = {
  data: DataAgentSpec,
  code: CodingAgentSpec,
};

/**
 * Build the LLM-callable `Agent` tool. The LLM passes a subagent name + task
 * string; we look up the descriptor and run a nested `runAgent` with the
 * subagent's spec. Depth is capped at 1 — subagents cannot themselves call
 * `Agent`, to keep budgets predictable and prevent runaway recursion.
 */
export function buildAgentTool(
  subagents: SubagentRunInfo[],
  deps: AgentToolDeps,
  onSubagentEvent?: (event: SubagentRunEvent) => void,
): AnyTool {
  return tool({
    description:
      'Delegate a focused task to a subagent. Two modes:\n' +
      ' • PERSISTED — pass `name` of an existing subagent from "Available subagents".\n' +
      ' • AD-HOC — pass `prompt` (role/instructions), optional `baseAgent` ("data"|"code", default "data"), optional `tools` whitelist. The subagent runs once, is not saved.\n' +
      'In both modes you also pass `task`: the self-contained user-message the subagent receives (it will NOT see your conversation). The subagent runs in its own loop with its own context, then returns only its final text.',
    inputSchema: z.object({
      name: z.string().optional().describe('Persisted subagent name. Mutually exclusive with `prompt`.'),
      prompt: z
        .string()
        .optional()
        .describe('Ad-hoc subagent role/instructions. Required when `name` is omitted.'),
      baseAgent: z
        .enum(['data', 'code'])
        .optional()
        .describe('Ad-hoc only: base agent that defines default tools/safety (default: "data").'),
      tools: z
        .array(z.string())
        .optional()
        .describe('Ad-hoc only: subset of base tools to expose to the subagent.'),
      task: z.string().min(1).describe('The full, self-contained task to give the subagent.'),
      background: z
        .boolean()
        .optional()
        .describe(
          'When true, launch the subagent asynchronously and return immediately with a `task_id`. Poll via `taskStatus({ task_id })`. Use this for long-running tasks (slow queries, big edits) so the conversation keeps flowing.',
        ),
    }),
    execute: async ({ name, prompt, baseAgent, tools: toolsArg, task, background }) => {
      let subagent: SubagentRunInfo | null = null;
      let displayName: string;

      if (name) {
        subagent = subagents.find((s) => s.name === name) ?? null;
        if (!subagent) {
          return { ok: false as const, error: `Unknown subagent "${name}".` };
        }
        displayName = name;
      } else if (prompt) {
        // Ad-hoc subagent: synthesize a SubagentRunInfo on the fly.
        subagent = {
          name: 'ad-hoc',
          description: prompt.slice(0, 80),
          baseAgent: baseAgent ?? 'data',
          tools: toolsArg,
          prompt,
          path: '<inline>',
        };
        displayName = 'ad-hoc';
      } else {
        return {
          ok: false as const,
          error: 'Agent requires either `name` (persisted) or `prompt` (ad-hoc).',
        };
      }

      const base = BASE_SPEC[subagent.baseAgent];
      const allowedTools: ToolName[] =
        subagent.tools && subagent.tools.length > 0
          ? subagent.tools.filter((t): t is ToolName => base.tools.includes(t as ToolName))
          : base.tools;
      const subSpec: AgentSpec = {
        id: base.id,
        label: `${subagent.name} (subagent)`,
        tools: allowedTools,
        promptPreamble: `${base.promptPreamble ?? ''}\n\n--- Subagent role: ${subagent.name} ---\n${subagent.prompt}`,
        routingKeywords: [],
      };

      const messages: ModelMessage[] = [{ role: 'user', content: task }];
      const startedAt = Date.now();

      // Background mode: register a job, kick off the runAgent without awaiting,
      // and return immediately with the task id. The parent agent must call
      // `taskStatus({ task_id })` to retrieve the result.
      if (background) {
        if (!deps.backgroundJobs) {
          return {
            ok: false as const,
            error: 'Background execution not available (no job registry wired).',
          };
        }
        const job = deps.backgroundJobs.create({ subagent: displayName, prompt: task });
        const taskId = job.id;
        onSubagentEvent?.({ kind: 'start', name: displayName, task });
        // Fire-and-forget: errors land in the registry, not the parent stream.
        void deps
          .runAgent({
            messages,
            compute: deps.compute,
            llm: deps.llm,
            logger: deps.logger,
            agent: subSpec,
            datasources: deps.datasources,
            apps: deps.apps,
            skills: deps.skills,
            registry: deps.registry,
            isSubagent: true,
            loadedTools: new Set(),
            onToolEvent: (event) => {
              deps.logger.debug('subagent.tool', {
                subagent: displayName,
                taskId,
                tool: event.name,
                status: event.status,
              });
              onSubagentEvent?.({ kind: 'tool', name: displayName, tool: event });
            },
            onToken: () => undefined,
          })
          .then((result) => {
            const durationMs = Date.now() - startedAt;
            deps.backgroundJobs!.complete(taskId, result.text, {
              inputTokens: result.usage.inputTokens ?? 0,
              outputTokens: result.usage.outputTokens ?? 0,
              totalTokens: result.usage.totalTokens,
            });
            onSubagentEvent?.({
              kind: 'finish',
              name: displayName,
              durationMs,
              usage: result.usage,
              text: result.text,
            });
          })
          .catch((err: unknown) => {
            const message = err instanceof Error ? err.message : String(err);
            deps.backgroundJobs!.fail(taskId, message);
            onSubagentEvent?.({ kind: 'error', name: displayName, error: message });
          });

        return {
          ok: true as const,
          background: true,
          task_id: taskId,
          state: 'running',
          message: `Subagent "${displayName}" started in background. Poll with taskStatus({ task_id: "${taskId}" }).`,
        };
      }

      // Foreground mode (existing behaviour).
      onSubagentEvent?.({ kind: 'start', name: displayName, task });
      try {
        const result = await deps.runAgent({
          messages,
          compute: deps.compute,
          llm: deps.llm,
          logger: deps.logger,
          agent: subSpec,
          datasources: deps.datasources,
          apps: deps.apps,
          skills: deps.skills,
          registry: deps.registry,
          // Depth cap = 1 — subagents cannot spawn further subagents.
          isSubagent: true,
          // Fresh tool-load context: the subagent doesn't inherit the parent's
          // loaded lazy tools.
          loadedTools: new Set(),
          // Subagent tool events are NOT forwarded to the parent UI by default
          // (they would be confusing). Only logged.
          onToolEvent: (event) => {
            deps.logger.debug('subagent.tool', {
              subagent: displayName,
              tool: event.name,
              status: event.status,
            });
            onSubagentEvent?.({ kind: 'tool', name: displayName, tool: event });
          },
          // No streaming relay either; we wait for the final text.
          onToken: () => undefined,
        });
        const durationMs = Date.now() - startedAt;
        onSubagentEvent?.({
          kind: 'finish',
          name: displayName,
          durationMs,
          usage: result.usage,
          text: result.text,
        });
        return {
          ok: true as const,
          name: displayName,
          text: result.text,
          durationMs,
          usage: {
            inputTokens: result.usage.inputTokens ?? 0,
            outputTokens: result.usage.outputTokens ?? 0,
            totalTokens: result.usage.totalTokens ?? 0,
          },
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        onSubagentEvent?.({ kind: 'error', name: displayName, error: message });
        return { ok: false as const, error: message };
      }
    },
  });
}
