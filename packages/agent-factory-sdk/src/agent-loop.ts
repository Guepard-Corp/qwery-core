import type { UsageInput } from '@qwery/domain';
import { type LanguageModel, stepCountIs, streamText, type ToolSet } from 'ai';
import type { AgentSpec } from './agent-spec';
import { DataAgentSpec } from './agent-spec';
import type { AgentRunOptions, AgentRunResult, SubagentRunInfo } from './agent-types';
import { estimateTotalTokens, makeAiSdkSummaryGenerator, runCompaction } from './compaction';
import { buildAgentTool, buildTaskStatusTool } from './subagent';
import { buildSystemPrompt } from './system-prompt';
import { buildTodoTools } from './todo-tools';
import { buildToolRegistry, makeRegistryContext } from './tool-registry';
import { buildTools } from './tools';

export type { AgentRunOptions, AgentRunResult } from './agent-types';

/**
 * Tool-call steps the model may take per turn before the loop stops. A thorough
 * task (e.g. a full database audit) can legitimately need many tool calls, so
 * this is generous; override with `QWERY_MAX_STEPS`. When the ceiling is hit
 * mid-tool-calling, {@link runAgent} runs a tool-less finalization pass so the
 * user still gets a written answer instead of an empty turn.
 */
export const DEFAULT_MAX_STEPS = 100;

function resolveMaxSteps(): number {
  const n = Number(process.env.QWERY_MAX_STEPS);
  return Number.isInteger(n) && n > 0 ? n : DEFAULT_MAX_STEPS;
}

/**
 * Debug switch: when truthy, the run-completion log events
 * (`agent.run.done` / `agent.run.aborted`) carry the full assistant `text`
 * in addition to `textLen`, so the verbatim report can be recovered from
 * the log. Off by default — the report can be large and may contain
 * datasource-derived content, so we only emit it when explicitly asked.
 */
function shouldLogReportText(): boolean {
  const raw = process.env.QWERY_DEBUG_REPORT_TEXT?.trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on';
}

export function formatStreamError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (!error || typeof error !== 'object') return String(error);
  const record = error as Record<string, unknown>;
  for (const key of ['message', 'error', 'reason', 'statusText']) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export async function runAgent(opts: AgentRunOptions): Promise<AgentRunResult> {
  const {
    compute,
    llm,
    logger,
    onToolEvent,
    onToken,
    datasources,
    apps,
    skills,
    schemaProvider,
    ontologyProvider,
    schemaRetriever,
  } = opts;
  const agent: AgentSpec = opts.agent ?? DataAgentSpec;
  const subagents: SubagentRunInfo[] = opts.subagents ?? [];
  const isSubagent = opts.isSubagent ?? false;
  const providerOptions = llm.getProviderOptions?.();

  logger.info('agent.run.start', { messageCount: opts.messages.length, agent: agent.id });
  const startedAt = Date.now();
  const maxSteps = resolveMaxSteps();
  const logReportText = shouldLogReportText();

  // Pre-turn compaction. We estimate the incoming prompt size and, if it
  // crosses the threshold, prune + summarize before kicking off streamText.
  // Subagents skip this — they always start with a fresh context anyway.
  let messages = opts.messages;
  if (!isSubagent && !opts.disableCompaction && opts.contextLimit && opts.contextLimit > 0) {
    const promptTokens = estimateTotalTokens(messages);
    const summaryGenerator = makeAiSdkSummaryGenerator(llm.getModel() as LanguageModel);
    const compaction = await runCompaction({
      messages,
      promptTokens,
      contextLimit: opts.contextLimit,
      reserved: opts.compactionReserved,
      previousSummary: opts.previousSummary,
      summaryGenerator,
    });
    if (compaction.phase !== 'none') {
      messages = compaction.messages;
      logger.info('agent.compaction', {
        phase: compaction.phase,
        prunedTokens: compaction.prunedTokens,
        prunedParts: compaction.prunedParts,
        savedTokens: compaction.savedTokens,
        summaryLength: compaction.summary?.length ?? 0,
        promptTokensBefore: promptTokens,
      });
      opts.onCompaction?.({
        phase: compaction.phase,
        prunedTokens: compaction.prunedTokens,
        prunedParts: compaction.prunedParts,
        summary: compaction.summary,
        savedTokens: compaction.savedTokens,
        promptTokensBefore: promptTokens,
      });
    }
  }

  const allTools = buildTools({
    compute,
    schemaProvider,
    ontologyProvider,
    schemaRetriever,
    sessionId: opts.sessionId,
    signal: opts.signal,
    logger,
    getAttachedDatasource: opts.getAttachedDatasource,
    revealDatasourceSecrets: opts.revealDatasourceSecrets,
    onEvent: (event) => {
      logger.info(`tool.${event.status}`, {
        id: event.id,
        name: event.name,
        input: event.input,
        durationMs: event.endedAt ? event.endedAt - event.startedAt : undefined,
        ...(event.output?.kind === 'error' ? { error: event.output.message } : {}),
        ...(event.output?.kind === 'runQuery' || event.output?.kind === 'present'
          ? { rowCount: event.output.result.rowCount }
          : {}),
        ...(event.output?.kind === 'dbAudit' ? { summary: event.output.summary } : {}),
      });
      onToolEvent(event);
    },
  });
  // Restrict the core tool roster to what this agent is allowed to call.
  const coreTools = Object.fromEntries(
    Object.entries(allTools).filter(([name]) => agent.tools.includes(name as keyof typeof allTools)),
  );

  // Optional `agent` tool (spawn a subagent). Always-active when this agent's
  // spec declares it AND we are not already inside a subagent (depth cap = 1).
  // Persisted subagents are optional — ad-hoc mode works with just `prompt`.
  if (!isSubagent && agent.tools.includes('agent')) {
    const agentTool = buildAgentTool(
      subagents,
      {
        runAgent,
        compute,
        llm,
        logger,
        datasources,
        apps,
        skills,
        registry: opts.registry,
        backgroundJobs: opts.backgroundJobs,
      },
      (event) => {
        // Emit a synthetic ToolEvent so the UI shows the subagent invocation.
        if (event.kind === 'start') {
          onToolEvent({
            id: `agent-${event.name}-${Date.now()}`,
            name: 'agent',
            status: 'running',
            startedAt: Date.now(),
            input: { name: event.name, task: event.task },
          });
        } else if (event.kind === 'finish') {
          const ended = Date.now();
          onToolEvent({
            id: `agent-${event.name}-finish-${ended}`,
            name: 'agent',
            status: 'done',
            startedAt: ended - event.durationMs,
            endedAt: ended,
            input: { name: event.name },
            output: {
              kind: 'agent',
              subagent: event.name,
              task: '',
              text: event.text,
              durationMs: event.durationMs,
              tokens: event.usage.totalTokens ?? 0,
            },
          });
        } else if (event.kind === 'error') {
          const ended = Date.now();
          onToolEvent({
            id: `agent-${event.name}-err-${ended}`,
            name: 'agent',
            status: 'error',
            startedAt: ended,
            endedAt: ended,
            input: { name: event.name },
            output: { kind: 'error', message: event.error },
          });
        }
        opts.onSubagentEvent?.(event);
      },
    );
    (coreTools as Record<string, unknown>).agent = agentTool;
  }

  // `taskStatus` is the companion to background `agent` calls — wired when the
  // job registry is available and the spec declares it.
  if (!isSubagent && agent.tools.includes('taskStatus') && opts.backgroundJobs) {
    (coreTools as Record<string, unknown>).taskStatus = buildTaskStatusTool(opts.backgroundJobs);
  }

  // Lazy registry: navigator tools (always active) + deferred CRUDs (active
  // only after `loadTool`). The set is shared with the caller via the
  // `loadedTools` Set so loads persist across turns within a session.
  const registryDeps = opts.registry ?? {};
  const registryContext = makeRegistryContext(opts.loadedTools);
  registryContext.onLoadedToolsChange = opts.onLoadedToolsChange;
  // Keep the caller's set in sync (we mutate the same instance).
  if (opts.loadedTools) registryContext.loadedTools = opts.loadedTools;
  const coreToolList = Object.keys(coreTools).map((name) => ({
    name,
    description: 'Base tool, always available.',
  }));
  const { deferred, navigators } = buildToolRegistry(registryDeps, coreToolList, registryContext);
  const deferredEntries = Object.fromEntries(deferred.map((d) => [d.name, d.tool]));

  // Todo tools — wired only when the caller passes a sessionId + store.
  let todoTools: Record<string, unknown> = {};
  if (agent.tools.includes('todoWrite') && opts.todoStore && opts.sessionId) {
    const built = buildTodoTools({
      store: opts.todoStore,
      sessionId: opts.sessionId,
      onChange: opts.onTodosChange,
    });
    todoTools = { todoWrite: built.todoWrite, todoRead: built.todoRead };
  }

  // Final tools map = core + navigators + deferred (registered, not necessarily active).
  // Cast to `ToolSet` so TypeScript treats `activeTools` as `string[]` rather
  // than narrowing to the three navigator keys it can see structurally.
  const tools = {
    ...coreTools,
    ...todoTools,
    listTools: navigators.listTools,
    searchTools: navigators.searchTools,
    loadTool: navigators.loadTool,
    ...deferredEntries,
  } as ToolSet;

  const navigatorNames = ['listTools', 'searchTools', 'loadTool'];

  // Skills can declare which agent they apply to. Filter accordingly.
  const scopedSkills = (skills ?? []).filter((s) => !s.agent || s.agent === 'all' || s.agent === agent.id);

  const totalUsage: UsageInput & { totalTokens: number } = {
    inputTokens: 0,
    outputTokens: 0,
    reasoningTokens: 0,
    cachedInputTokens: 0,
    totalTokens: 0,
  };
  let finishReason: string | null = null;
  // Hoisted out of the try so the catch can preserve partial text on abort.
  let assistantText = '';

  // Built once and reused by the step-limit finalization pass below.
  const systemPrompt = buildSystemPrompt({
    datasources,
    apps,
    skills: scopedSkills,
    // Subagents are only advertised to the parent — inside a subagent loop,
    // we pass `undefined` so the whole block (persisted + ad-hoc) is
    // omitted, preventing recursive spawn.
    subagents: isSubagent
      ? undefined
      : subagents.map((sa) => ({
          name: sa.name,
          description: sa.description,
          baseAgent: sa.baseAgent,
        })),
    agentPreamble: agent.promptPreamble,
  });
  const providerOptionsArg = providerOptions
    ? { providerOptions: providerOptions as Parameters<typeof streamText>[0]['providerOptions'] }
    : {};

  try {
    const result = streamText({
      model: llm.getModel() as LanguageModel,
      ...providerOptionsArg,
      system: systemPrompt,
      messages,
      tools,
      // `activeTools` controls which tools are advertised to the LLM at each
      // step. The base (core) tools and navigators are always active; deferred
      // tools become active only after `loadTool` adds them to the registry
      // context. `prepareStep` re-computes this set on every step so a load
      // mid-turn unlocks the new tool for the next step.
      activeTools: [
        ...Object.keys(coreTools),
        ...Object.keys(todoTools),
        ...navigatorNames,
        ...[...registryContext.loadedTools],
      ],
      prepareStep: async () => ({
        activeTools: [
          ...Object.keys(coreTools),
          ...Object.keys(todoTools),
          ...navigatorNames,
          ...[...registryContext.loadedTools],
        ],
      }),
      stopWhen: stepCountIs(maxSteps),
      abortSignal: opts.signal,
      onStepFinish: ({ finishReason: reason, usage, toolCalls, toolResults, text }) => {
        logger.info('agent.step.finish', {
          finishReason: reason,
          usage,
          toolCallNames: toolCalls?.map((c) => c.toolName),
          toolResultCount: toolResults?.length ?? 0,
          textLen: text?.length ?? 0,
        });
        if (usage) {
          totalUsage.inputTokens = (totalUsage.inputTokens ?? 0) + (usage.inputTokens ?? 0);
          totalUsage.outputTokens = (totalUsage.outputTokens ?? 0) + (usage.outputTokens ?? 0);
          totalUsage.reasoningTokens = (totalUsage.reasoningTokens ?? 0) + (usage.reasoningTokens ?? 0);
          totalUsage.cachedInputTokens = (totalUsage.cachedInputTokens ?? 0) + (usage.cachedInputTokens ?? 0);
          totalUsage.totalTokens = (totalUsage.totalTokens ?? 0) + (usage.totalTokens ?? 0);
        }
      },
    });

    let streamError: string | null = null;
    for await (const part of result.fullStream) {
      switch (part.type) {
        case 'text-delta':
          assistantText += part.text;
          onToken(part.text);
          break;
        case 'tool-call':
          logger.info('llm.tool-call', {
            toolName: part.toolName,
            toolCallId: part.toolCallId,
            input: part.input,
          });
          break;
        case 'tool-result':
          logger.debug('llm.tool-result', {
            toolName: part.toolName,
            toolCallId: part.toolCallId,
          });
          break;
        case 'tool-error':
          logger.error('llm.tool-error', {
            toolName: part.toolName,
            toolCallId: part.toolCallId,
            error: formatStreamError(part.error),
          });
          break;
        case 'error':
          streamError = formatStreamError(part.error);
          logger.error('llm.stream.error', { error: streamError });
          break;
        case 'finish':
          finishReason = part.finishReason ?? null;
          logger.info('llm.finish', { finishReason: part.finishReason, usage: part.totalUsage });
          break;
        default:
          break;
      }
    }

    if (streamError) throw new Error(`LLM stream error: ${streamError}`);

    // The loop stopped while the model still wanted to call tools (it hit the
    // `maxSteps` ceiling) and never wrote a response — without this the user
    // sees an empty turn. Run one tool-less pass so the model summarizes what
    // it gathered into a final answer. Skipped if the caller aborted.
    if (!opts.signal?.aborted && finishReason === 'tool-calls' && assistantText.trim() === '') {
      logger.info('agent.run.finalize', { reason: 'step-limit', maxSteps });
      const priorMessages = (await result.response).messages;
      const finalize = streamText({
        model: llm.getModel() as LanguageModel,
        ...providerOptionsArg,
        system: systemPrompt,
        // Honor the same abort signal as the main stream — without it a
        // user-initiated Ctrl+C during finalization keeps streaming/billing
        // tokens until the summary completes.
        abortSignal: opts.signal,
        messages: [
          ...messages,
          ...priorMessages,
          {
            role: 'user',
            content: `You reached the ${maxSteps}-step tool-call limit. Do not call any more tools. Summarize the findings you have gathered and give your final answer now.`,
          },
        ] as typeof messages,
      });
      for await (const part of finalize.fullStream) {
        if (part.type === 'text-delta') {
          assistantText += part.text;
          onToken(part.text);
        } else if (part.type === 'finish') {
          finishReason = part.finishReason ?? finishReason;
        } else if (part.type === 'error') {
          // Finalization is best-effort — log and keep whatever we have.
          logger.error('agent.run.finalize.error', { error: formatStreamError(part.error) });
        }
      }
    }

    const durationMs = Date.now() - startedAt;
    // If the caller aborted but streamText returned without throwing (e.g.
    // the signal was already aborted before any chunk could arrive, or the
    // provider chose to swallow the abort silently), surface that as
    // 'aborted' so the UI can show the right state.
    if (opts.signal?.aborted) {
      logger.info('agent.run.aborted', {
        durationMs,
        textLen: assistantText.length,
        totalUsage,
        ...(logReportText ? { text: assistantText } : {}),
      });
      return { text: assistantText, usage: totalUsage, durationMs, finishReason: 'aborted' };
    }
    logger.info('agent.run.done', {
      textLen: assistantText.length,
      durationMs,
      totalUsage,
      ...(logReportText ? { text: assistantText } : {}),
    });
    return { text: assistantText, usage: totalUsage, durationMs, finishReason };
  } catch (err) {
    // AbortError is not a failure — the caller intentionally cancelled.
    // Return whatever partial text we collected before the abort so the
    // user keeps the half-answer instead of seeing an error toast.
    const aborted = (err instanceof Error && err.name === 'AbortError') || opts.signal?.aborted === true;
    if (aborted) {
      const durationMs = Date.now() - startedAt;
      logger.info('agent.run.aborted', {
        durationMs,
        textLen: assistantText.length,
        totalUsage,
        ...(logReportText ? { text: assistantText } : {}),
      });
      return {
        text: assistantText,
        usage: totalUsage,
        durationMs,
        finishReason: 'aborted',
      };
    }
    const message = err instanceof Error ? err.message : String(err);
    logger.error('agent.run.error', {
      message,
      stack: err instanceof Error ? err.stack : undefined,
    });
    throw err;
  }
}
