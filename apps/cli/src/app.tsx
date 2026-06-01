import {
  createHashingEmbedder,
  createInProcessOntologyProvider,
  createInProcessSchemaRetriever,
} from '@qwery/adapter-semantic-inprocess';
import type { AttachedDatasourceSummary } from '@qwery/agent-factory-sdk';
import {
  AGENT_SPECS,
  type AgentId,
  type AgentSpec,
  type BackgroundJobRegistry,
  createBackgroundJobRegistry,
  createTodoStore,
  routeAgent,
  runAgent,
  type TodoStore,
} from '@qwery/agent-factory-sdk';
import { Message as MessageUseCases, Session as SessionUseCases, UsageUseCase } from '@qwery/application';
import {
  type Message as DomainMessage,
  getContextLimit,
  MessageRole,
  type TelemetrySpan,
  type Todo,
  type ToolEvent,
  type ToolName,
} from '@qwery/domain';
import { AGENT_EVENTS } from '@qwery/telemetry/events';
import type { ModelMessage } from 'ai';
import { Box, Text, useApp, useInput, useStdout } from 'ink';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { autoRunPromptFor } from './agent-autorun';
import type { ChatEntry } from './chat-entry';
import type { AttachState } from './infra/datasources';
import { listLocalApps } from './infra/local-apps';
import { LOG_PATH } from './infra/logger';
import { runShell } from './infra/shell';
import { type SkillSummary as LocalSkillSummary, listLocalSkills, readLocalSkill } from './infra/skills';
import { listLocalSubagents } from './infra/subagents';
import {
  instrumentToolEvent,
  recordTurnTokens,
  trackCommand,
  trackCompaction,
  trackError,
  trackShell,
  trackTurnCompleted,
  trackUpdateCheck,
} from './infra/telemetry-actions';
import type { UpdateOutcome } from './infra/updater';
import { getAppVersion } from './infra/version';
import { useServices } from './services';
import { AgentsOverlay } from './tui/agents-overlay';
import { flattenChatLines } from './tui/chat-lines';
import { ChatView } from './tui/chat-view';
import { ContextOverlay } from './tui/context-overlay';
import { DatasourcesOverlay } from './tui/datasources-overlay';
import { EMPTY_INPUT_STATE, InputBar, type InputState } from './tui/input-bar';
import { activeProviderLabel, ModelsOverlay } from './tui/models-overlay';
import { ResultsView, type ResultViewMode } from './tui/results-view';
import { ResumeOverlay } from './tui/resume-overlay';
import { EMPTY_SESSION_TOTALS, type SessionTotals, StatusBar } from './tui/status-bar';
import { TabBar, type TabKey } from './tui/tabs';

const SESSION_TITLE_MAX = 60;
const HISTORY_MAX = 500;

function deriveSessionTitle(prompt: string): string {
  const cleaned = prompt.trim().replace(/\s+/g, ' ');
  if (cleaned.length === 0) return 'Untitled session';
  if (cleaned.length <= SESSION_TITLE_MAX) return cleaned;
  const truncated = cleaned.slice(0, SESSION_TITLE_MAX);
  const lastSpace = truncated.lastIndexOf(' ');
  return `${lastSpace > 30 ? truncated.slice(0, lastSpace) : truncated}…`;
}

/** One human-readable line per artifact for the `/update` command output. */
function formatUpdate(o: UpdateOutcome): string {
  switch (o.action) {
    case 'stage':
    case 'already-staged':
      return `${o.app}: ${o.latest} ready — restart to apply (current ${o.current ?? 'unknown'})`;
    case 'up-to-date':
      return `${o.app}: up to date (${o.current ?? 'unknown'})`;
    case 'failed':
      return `${o.app}: update check failed (offline or unavailable)`;
    default:
      return `${o.app}: version unknown — update check skipped`;
  }
}

/** True when at least one artifact has a release staged for next launch. */
function hasStagedUpdate(outcomes: UpdateOutcome[] | null): boolean {
  return (outcomes ?? []).some((o) => o.action === 'stage' || o.action === 'already-staged');
}

function emptyLastByTool(): Record<ToolName, ToolEvent | null> {
  return {
    schema: null,
    runQuery: null,
    describeQuery: null,
    present: null,
    bash: null,
    read: null,
    write: null,
    edit: null,
    agent: null,
    taskStatus: null,
    todoWrite: null,
    todoRead: null,
    validateQuery: null,
    searchSchema: null,
    expandSchema: null,
    detectDbEngine: null,
    getTopSlowQueries: null,
    explainQueryPlan: null,
    compareQueryRewrite: null,
    getIndexHealth: null,
    getTableHealth: null,
    getInfraRuntimeSignals: null,
    getRecentDbLogs: null,
    getLockAndBlockingAnalysis: null,
    getStatisticsHealth: null,
    getBloatEstimates: null,
    getReplicationHealth: null,
    validateRemediationInGfsCli: null,
  };
}

export function App() {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const services = useServices();
  const {
    compute,
    llm,
    configStore,
    logger,
    sessionRepo,
    messageRepo,
    usageRepo,
    modelCatalog,
    datasourceRepo,
    attachedDatasources,
    branching,
    updater,
    telemetry,
    currentProject,
  } = services;
  const termRows = stdout?.rows ?? 30;
  const termCols = stdout?.columns ?? 80;
  // Real app version (baked at build, or ~/.qwery/version); 'dev' when unknown.
  const appVersion = useMemo(() => getAppVersion(), []);
  const [activeTab, setActiveTab] = useState<TabKey>('chat');
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [streaming, setStreaming] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [resultsBadge, setResultsBadge] = useState(false);
  const [activeResult, setActiveResult] = useState<ToolEvent | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [overlay, setOverlay] = useState<null | 'models' | 'resume' | 'datasources' | 'context' | 'agents'>(
    null,
  );
  const [overlayContextSnapshot, setOverlayContextSnapshot] = useState<{
    apps: import('@qwery/agent-factory-sdk').LocalAppSummary[];
    skills: import('@qwery/agent-factory-sdk').SkillSummary[];
    subagents: import('@qwery/agent-factory-sdk').SubagentInfo[];
  } | null>(null);
  const [attachStates, setAttachStates] = useState<AttachState[]>([]);
  const [pinnedAgent, setPinnedAgent] = useState<AgentId | null>(null);
  const [activeAgent, setActiveAgent] = useState<AgentSpec>(AGENT_SPECS.data);
  const [providerLabel, setProviderLabel] = useState<string | null>(activeProviderLabel(configStore));
  const [gfsVersion, setGfsVersion] = useState<string | null>(null);
  const [updateOutcomes, setUpdateOutcomes] = useState<UpdateOutcome[] | null>(null);
  const [layoutMode, setLayoutMode] = useState<'focus' | 'split'>('split');
  // App padding (1 char each side) + extra padding for borders. In split
  // mode the chat occupies roughly half the terminal width.
  const chatPaneWidth =
    layoutMode === 'split' ? Math.max(20, Math.floor(termCols / 2) - 4) : Math.max(20, termCols - 4);
  // Rows the chat pane (including its own padding) may occupy. Reserve the
  // surrounding chrome — header, pane label / tab bar, agent-status line, input
  // box (3 rows), status bar — so ChatView can bound its own height. Ink can't
  // reliably clip vertical overflow, so the view must never exceed this.
  const chatAvailableHeight = Math.max(4, termRows - (layoutMode === 'split' ? 9 : 8));
  // The chat flattened to one node per terminal row, so the view can window it
  // by line (exact height) and scroll line-by-line through long output.
  const chatLines = useMemo(
    () => flattenChatLines(entries, streaming, chatPaneWidth),
    [entries, streaming, chatPaneWidth],
  );
  // Rows of chat content visible at once, and the furthest we can scroll up.
  // The `+1` reclaims the row a "more below" indicator costs once scrolled, so
  // the very first line stays reachable; clamped to 0 when everything fits.
  const chatContentRows = Math.max(1, chatAvailableHeight - 2);
  const chatMaxScroll = chatLines.length <= chatContentRows ? 0 : chatLines.length - chatContentRows + 1;
  const [resultMode, setResultMode] = useState<ResultViewMode>('data');
  const [inputState, setInputState] = useState<InputState>(EMPTY_INPUT_STATE);
  const [sessionTotals, setSessionTotals] = useState<SessionTotals>(EMPTY_SESSION_TOTALS);
  const [chatScrollOffset, setChatScrollOffset] = useState(0);
  const [contextLimit, setContextLimit] = useState<number | null>(null);
  const [lastTurnInputTokens, setLastTurnInputTokens] = useState(0);
  const lastByType = useRef<Record<ToolEvent['name'], ToolEvent | null>>(emptyLastByTool());
  const session = useRef<ModelMessage[]>([]);
  const sessionId = useRef<string | null>(null);
  /** Names of deferred (lazy) tools the LLM has loaded so far this session. */
  const loadedTools = useRef<Set<string>>(new Set());
  /** Process-local registry of background subagent jobs. */
  const backgroundJobs = useRef<BackgroundJobRegistry>(createBackgroundJobRegistry());
  /** Todo store shared with the UI. */
  const todoStore = useRef<TodoStore>(createTodoStore());
  const [sessionTodos, setSessionTodos] = useState<Todo[]>([]);
  /** Rolling compaction summary carried across turns in the same session. */
  const rollingSummary = useRef<string | null>(null);
  /** AbortController for the in-flight turn; null when idle. */
  const turnAbort = useRef<AbortController | null>(null);
  /** Open telemetry spans for in-flight tool calls, keyed by tool-event id. */
  const toolSpans = useRef<Map<string, TelemetrySpan>>(new Map());

  const ensureSession = useCallback(async (): Promise<string> => {
    if (sessionId.current) return sessionId.current;
    const s = await SessionUseCases.createSession(
      { sessionRepo },
      { title: `Session ${new Date().toISOString()}`, projectId: currentProject.id },
    );
    sessionId.current = s.id;
    logger.info('session.created', { sessionId: s.id, slug: s.slug, projectId: currentProject.id });
    return s.id;
  }, [sessionRepo, logger, currentProject]);

  useEffect(() => {
    ensureSession().catch((err) => {
      logger.error('session.init.error', { message: err instanceof Error ? err.message : String(err) });
    });
  }, [ensureSession, logger]);

  // Seed the input history with previous user prompts from every past session
  // so ↑/↓ recall works across restarts, not just within the current session.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const all = await messageRepo.findAll();
      if (cancelled) return;
      const prompts: string[] = [];
      for (const m of all) {
        if (m.role !== MessageRole.USER) continue;
        const text =
          m.content.parts
            ?.filter(
              (p): p is { type: 'text'; text: string } => p.type === 'text' && typeof p.text === 'string',
            )
            .map((p) => p.text)
            .join('') ?? '';
        if (text.length === 0) continue;
        if (prompts[prompts.length - 1] === text) continue;
        prompts.push(text);
      }
      const recent = prompts.slice(-HISTORY_MAX);
      setHistory(recent);
    })().catch((err) =>
      logger.error('history.load.error', {
        message: err instanceof Error ? err.message : String(err),
      }),
    );
    return () => {
      cancelled = true;
    };
  }, [messageRepo, logger]);

  useEffect(() => attachedDatasources.subscribe(setAttachStates), [attachedDatasources]);

  // Detect the GFS branching engine once at startup to surface it in the header.
  // Shelling out to the binary is async I/O, so it belongs in an effect.
  useEffect(() => {
    let cancelled = false;
    void branching.version().then((v) => {
      if (!cancelled) setGfsVersion(v ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [branching]);

  const runUpdateCheck = useCallback(async (): Promise<UpdateOutcome[]> => {
    const outcomes = await updater.checkAndStage();
    setUpdateOutcomes(outcomes);
    return outcomes;
  }, [updater]);

  // Justified effect: a one-shot background update check at startup (ADR #37).
  // It detects newer qwery/GFS releases and stages them for the wrapper to apply
  // on next launch. Fire-and-forget; never blocks the UI. Opt out with the env var.
  useEffect(() => {
    if (process.env.QWERY_NO_UPDATE_CHECK) return;
    void runUpdateCheck().catch((err) => logger.warn('updater.check.error', { error: String(err) }));
  }, [runUpdateCheck, logger]);

  // Datasources are not auto-attached on startup — the user attaches the ones
  // they want via /datasources. (Attaching every datasource on the machine
  // polluted the agent's context and the status bar.)

  const datasourceSummaries = useMemo<AttachedDatasourceSummary[]>(() => {
    return attachStates
      .filter((s): s is AttachState & { status: 'attached' } => s.status === 'attached')
      .map((s) => ({
        name: s.datasource.name,
        provider: s.datasource.datasource_provider,
        tables: s.tables.map((t) => ({
          path: t.path,
          columns: t.columns,
        })),
      }));
  }, [attachStates]);

  // Resolve the context limit for the active model from the models.dev catalog.
  useEffect(() => {
    let cancelled = false;
    if (!providerLabel) {
      setContextLimit(null);
      return;
    }
    void modelCatalog
      .getCatalog()
      .then((catalog) => {
        if (cancelled) return;
        const cfg = configStore.getActiveProvider();
        if (!cfg) return;
        const modelId = cfg.values.model ?? cfg.values.deployment ?? '';
        setContextLimit(getContextLimit(catalog, `${cfg.id}/${modelId}`));
      })
      .catch(() => {
        // catalog unreachable — leave the limit as-is
      });
    return () => {
      cancelled = true;
    };
  }, [providerLabel, modelCatalog, configStore]);

  const persistMessage = useCallback(
    async (
      role: MessageRole,
      text: string,
      metadata?: Record<string, unknown>,
    ): Promise<DomainMessage | null> => {
      try {
        const sid = await ensureSession();
        return await MessageUseCases.createMessage(
          { messageRepo },
          {
            sessionId: sid,
            role,
            content: { parts: [{ type: 'text', text }] },
            ...(metadata ? { metadata } : {}),
          },
        );
      } catch (err) {
        logger.error('message.persist.error', {
          message: err instanceof Error ? err.message : String(err),
        });
        return null;
      }
    },
    [ensureSession, messageRepo, logger],
  );

  const activeModelKey = useCallback((): string => {
    const cfg = configStore.getActiveProvider();
    if (!cfg) return 'unknown/unknown';
    const model = cfg.values.model ?? cfg.values.deployment ?? 'unknown';
    return `${cfg.id}/${model}`;
  }, [configStore]);

  /** Load a session's messages + usage and rebuild the in-memory chat state. */
  const resumeSession = useCallback(
    async (id: string): Promise<void> => {
      try {
        const target = await SessionUseCases.getSession({ sessionRepo }, id);
        if (!target) throw new Error(`Session ${id} not found`);
        const msgs = await MessageUseCases.listMessagesBySession({ messageRepo }, id);
        const usages = await UsageUseCase.listUsageBySession({ usageRepo }, id);

        const restoredEntries: ChatEntry[] = [];
        const restoredModelMessages: ModelMessage[] = [];
        let lastSummary: string | null = null;
        for (const m of msgs) {
          const text =
            m.content.parts
              ?.filter(
                (p): p is { type: 'text'; text: string } => p.type === 'text' && typeof p.text === 'string',
              )
              .map((p) => p.text)
              .join('') ?? '';
          if (!text) continue;
          const isSummary = m.metadata?.summary === true;
          if (isSummary) {
            // Hidden from the chat view; latest one becomes the rolling
            // summary so the next runAgent injects it as previousSummary.
            lastSummary = text;
            continue;
          }
          if (m.role === MessageRole.USER) {
            restoredEntries.push({ kind: 'user', text });
            restoredModelMessages.push({ role: 'user', content: text });
          } else if (m.role === MessageRole.ASSISTANT) {
            restoredEntries.push({ kind: 'assistant', text });
            restoredModelMessages.push({ role: 'assistant', content: text });
          }
        }

        const totals = usages.reduce(
          (acc, u) => ({
            inputTokens: acc.inputTokens + u.inputTokens,
            outputTokens: acc.outputTokens + u.outputTokens,
            totalTokens: acc.totalTokens + u.totalTokens,
            costUSD: acc.costUSD + u.costUSD,
          }),
          EMPTY_SESSION_TOTALS,
        );
        const lastUsage = usages[usages.length - 1];

        sessionId.current = id;
        session.current = restoredModelMessages;
        loadedTools.current.clear();
        rollingSummary.current = lastSummary;
        setSessionTodos([]);
        setEntries(restoredEntries);
        setSessionTotals(totals);
        setLastTurnInputTokens(lastUsage?.inputTokens ?? 0);
        setChatScrollOffset(0);
        setActiveResult(null);
        setResultsBadge(false);
        lastByType.current = emptyLastByTool();
        setEntries((p) => [
          ...p,
          {
            kind: 'assistant',
            text: `Resumed session "${target.title}" — ${restoredEntries.length} messages, $${totals.costUSD.toFixed(4)} so far.`,
          },
        ]);
        logger.info('session.resumed', { sessionId: id, messageCount: restoredEntries.length });

        for (const dsId of target.datasources) {
          const ds = await datasourceRepo.findById(dsId);
          if (!ds) {
            logger.warn('session.resume.datasource-missing', { sessionId: id, datasourceId: dsId });
            continue;
          }
          const state = await attachedDatasources.attach(ds);
          if (state.status === 'error') {
            setEntries((p) => [
              ...p,
              { kind: 'assistant', text: `[warn] failed to attach "${ds.name}": ${state.error}` },
            ]);
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error('session.resume.error', { message });
        setEntries((p) => [
          ...p,
          { kind: 'assistant', text: `[error] failed to resume session: ${message}` },
        ]);
      }
    },
    [sessionRepo, messageRepo, usageRepo, datasourceRepo, attachedDatasources, logger],
  );

  const focusResults = useCallback(() => {
    setActiveTab('results');
    setResultsBadge(false);
  }, []);

  useInput((input, key) => {
    // Ctrl+C: abort the in-flight turn while busy, exit when idle. This
    // shortcut works even when an overlay is open, so users can always bail.
    if (key.ctrl && input === 'c') {
      if (busy && turnAbort.current) {
        turnAbort.current.abort();
        return;
      }
      exit();
      return;
    }
    if (overlay) return;

    if (key.ctrl && input === 'b') {
      setLayoutMode((m) => (m === 'focus' ? 'split' : 'focus'));
      return;
    }

    if (key.ctrl && input === 'r') {
      const last = lastByType.current.present ?? lastByType.current.runQuery;
      if (last) {
        setActiveResult(last);
        setResultMode('data');
        if (layoutMode === 'focus') focusResults();
      }
      return;
    }

    if (key.ctrl && input === 'i') {
      const last = lastByType.current.schema ?? lastByType.current.describeQuery;
      if (last) {
        setActiveResult(last);
        setResultMode('schema');
        if (layoutMode === 'focus') focusResults();
      }
      return;
    }

    if (key.ctrl && input === 'l') {
      if (activeResult?.output && activeResult.output.kind !== 'error') {
        setResultMode((m) => (m === 'sql' ? 'data' : 'sql'));
        if (layoutMode === 'focus') focusResults();
      }
      return;
    }

    if (key.tab && layoutMode === 'focus') {
      setActiveTab((t) => (t === 'chat' ? 'results' : 'chat'));
      if (activeTab === 'chat') setResultsBadge(false);
    }

    // Chat scroll (in lines): Shift+↑ scrolls toward older output, Shift+↓ back
    // toward the latest; PageUp/PageDown jump by a screenful. Clamped so it can
    // never scroll past the top or below the live bottom.
    const page = Math.max(1, chatContentRows - 1);
    if (key.shift && key.upArrow) {
      setChatScrollOffset((o) => Math.min(chatMaxScroll, o + 1));
      return;
    }
    if (key.shift && key.downArrow) {
      setChatScrollOffset((o) => Math.max(0, o - 1));
      return;
    }
    if (key.pageUp) {
      setChatScrollOffset((o) => Math.min(chatMaxScroll, o + page));
      return;
    }
    if (key.pageDown) {
      setChatScrollOffset((o) => Math.max(0, o - page));
      return;
    }
  });

  const handleToolEvent = useCallback((event: ToolEvent) => {
    setEntries((prev) => {
      const idx = prev.findIndex((e) => e.kind === 'tool' && e.event.id === event.id);
      const next = idx === -1 ? [...prev, { kind: 'tool' as const, event }] : [...prev];
      if (idx !== -1) next[idx] = { kind: 'tool', event };
      // When a present completes, append the rendered output as a chat entry.
      if (
        event.status === 'done' &&
        event.output &&
        event.output.kind === 'present' &&
        (idx === -1 || (prev[idx]?.kind === 'tool' && prev[idx].event.status !== 'done'))
      ) {
        next.push({ kind: 'rendered', text: event.output.rendered, result: event.output.result });
      }
      return next;
    });
    if (event.status === 'done' && event.output && event.output.kind !== 'error') {
      lastByType.current[event.name] = event;
      setActiveResult(event);
      const mode =
        event.output.kind === 'schema' || event.output.kind === 'describeQuery' ? 'schema' : 'data';
      setResultMode(mode);
      setResultsBadge(true);
    }
    if (event.status === 'error') {
      setActiveResult(event);
      setResultsBadge(true);
    }
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: attachedDatasources methods are stable (single registry from context)
  const submit = useCallback(
    async (text: string, agentOverride?: AgentSpec) => {
      if (busy) return;

      // `!cmd` runs a shell command locally. Its output is shown in chat but is
      // never persisted nor pushed to session.current — it stays out of the LLM.
      if (text.startsWith('!')) {
        const command = text.slice(1).trim();
        if (command.length === 0) return;
        setHistory((h) => [...h, text]);
        setChatScrollOffset(0);
        const { output, exitCode } = await runShell(command);
        trackShell(telemetry, exitCode);
        setEntries((p) => [...p, { kind: 'shell', command, output, exitCode }]);
        return;
      }

      // Record the slash command (closed vocabulary, never user content) before dispatch.
      if (text.startsWith('/')) trackCommand(telemetry, text);

      if (text === '/clear') {
        setEntries([]);
        setStreaming('');
        setActiveResult(null);
        setResultsBadge(false);
        setSessionTotals(EMPTY_SESSION_TOTALS);
        setLastTurnInputTokens(0);
        setChatScrollOffset(0);
        lastByType.current = emptyLastByTool();
        session.current = [];
        sessionId.current = null;
        loadedTools.current.clear();
        rollingSummary.current = null;
        setSessionTodos([]);
        void ensureSession();
        return;
      }
      if (text === '/help') {
        setEntries((p) => [
          ...p,
          {
            kind: 'assistant',
            text:
              'Slash commands: /models, /datasources, /agents, /context, /data, /code, /audit, /optimize, /auto, /layout, /resume, /clear, /help, /logs, /update, /quit.\n' +
              'Hotkeys: Tab (switch view, focus mode), Ctrl+B (toggle split), Ctrl+R (last data), Ctrl+I (last schema), Ctrl+L (toggle SQL view), Ctrl+C (quit), ↑/↓ (history).',
          },
        ]);
        return;
      }
      if (text === '/resume') {
        setOverlay('resume');
        return;
      }
      if (text === '/models') {
        setOverlay('models');
        return;
      }
      if (text === '/datasources') {
        setOverlay('datasources');
        return;
      }
      if (text === '/agents') {
        setOverlay('agents');
        return;
      }
      if (text === '/context') {
        void (async () => {
          const [appsForCtx, skillsForCtx, subagentsForCtx] = await Promise.all([
            listLocalApps().catch(() => []),
            listLocalSkills().catch(() => [] as LocalSkillSummary[]),
            listLocalSubagents().catch(() => []),
          ]);
          setOverlayContextSnapshot({
            apps: appsForCtx,
            skills: skillsForCtx.map((s) => ({
              name: s.name,
              description: s.description,
              path: s.path,
              agent: s.agent,
            })),
            subagents: subagentsForCtx.map((sa) => ({
              name: sa.name,
              description: sa.description,
              baseAgent: sa.baseAgent,
            })),
          });
          setOverlay('context');
        })();
        return;
      }
      if (
        text === '/data' ||
        text === '/code' ||
        text === '/audit' ||
        text === '/optimize' ||
        text === '/auto'
      ) {
        const next =
          text === '/auto'
            ? null
            : text === '/code'
              ? ('code' as AgentId)
              : text === '/audit'
                ? ('db-performance-audit' as AgentId)
                : text === '/optimize'
                  ? ('slow-query-optimizer' as AgentId)
                  : ('data' as AgentId);
        setPinnedAgent(next);
        const label = next === null ? 'auto (heuristic)' : AGENT_SPECS[next].label;
        setEntries((p) => [...p, { kind: 'assistant', text: `Agent routing pinned to: ${label}.` }]);
        if (next !== null) setActiveAgent(AGENT_SPECS[next]);
        // Audit agents auto-run their default task on selection, matching the
        // db-audit TUI. The pinned-agent state update above is async, so pass
        // the agent spec explicitly to the recursive run.
        const autoPrompt = autoRunPromptFor(next);
        if (next !== null && autoPrompt) {
          void submit(autoPrompt, AGENT_SPECS[next]);
        }
        return;
      }
      if (text === '/layout' || text === '/split' || text === '/focus') {
        setLayoutMode((m) => (m === 'focus' ? 'split' : 'focus'));
        return;
      }
      if (text === '/logs') {
        setEntries((p) => [
          ...p,
          {
            kind: 'assistant',
            text: `Logs are written to ${LOG_PATH}\nTail them in another terminal:\n  tail -f ${LOG_PATH}`,
          },
        ]);
        return;
      }
      if (text === '/update') {
        setEntries((p) => [...p, { kind: 'assistant', text: 'Checking for updates…' }]);
        void runUpdateCheck()
          .then((outcomes) => {
            trackUpdateCheck(telemetry, true, outcomes.filter((o) => o.action === 'stage').length);
            setEntries((p) => [
              ...p,
              {
                kind: 'assistant',
                text: `Updates:\n${outcomes.map((o) => `  • ${formatUpdate(o)}`).join('\n')}`,
              },
            ]);
          })
          .catch(() => {
            trackUpdateCheck(telemetry, false, 0);
            setEntries((p) => [...p, { kind: 'assistant', text: 'Update check failed (offline?).' }]);
          });
        return;
      }
      if (text === '/quit' || text === '/exit') {
        exit();
        return;
      }

      const isFirstTurn = session.current.length === 0;
      const agent = agentOverride ?? (pinnedAgent ? AGENT_SPECS[pinnedAgent] : routeAgent(text));
      setActiveAgent(agent);
      setHistory((h) => [...h, text]);
      setEntries((p) => [...p, { kind: 'user', text }]);
      setChatScrollOffset(0); // new prompt → stick to bottom
      session.current.push({ role: 'user', content: text });
      void persistMessage(MessageRole.USER, text);
      if (isFirstTurn && sessionId.current) {
        void SessionUseCases.updateSession({ sessionRepo }, sessionId.current, {
          title: deriveSessionTitle(text),
          seedMessage: text,
        }).catch((err) =>
          logger.error('session.title.update.error', {
            message: err instanceof Error ? err.message : String(err),
          }),
        );
      }
      setBusy(true);
      setStreaming('');

      let buffer = '';
      let toolCallCount = 0;
      const abort = new AbortController();
      turnAbort.current = abort;
      try {
        const [apps, allSkills, subagentsList] = await Promise.all([
          listLocalApps().catch((err) => {
            logger.warn('apps.list.error', {
              message: err instanceof Error ? err.message : String(err),
            });
            return [];
          }),
          listLocalSkills().catch((err) => {
            logger.warn('skills.list.error', {
              message: err instanceof Error ? err.message : String(err),
            });
            return [] as LocalSkillSummary[];
          }),
          listLocalSubagents().catch((err) => {
            logger.warn('subagents.list.error', {
              message: err instanceof Error ? err.message : String(err),
            });
            return [];
          }),
        ]);
        const {
          text: finalText,
          usage,
          durationMs,
          finishReason,
          // The whole turn runs inside a span so each tool span nests under it.
        } = await telemetry.withSpan(AGENT_EVENTS.TURN, { mode: agent.id, first_turn: isFirstTurn }, () =>
          runAgent({
            messages: session.current,
            compute,
            llm,
            logger,
            agent,
            signal: abort.signal,
            datasources: datasourceSummaries,
            schemaProvider: { listSchemas: () => attachedDatasources.schemas() },
            getAttachedDatasource: async () => {
              const attached = attachedDatasources.list().find((state) => state.status === 'attached');
              return attached?.datasource ?? null;
            },
            revealDatasourceSecrets: (datasource) =>
              datasourceRepo.revealSecrets(datasource.config as Record<string, unknown>),
            ontologyProvider: createInProcessOntologyProvider(),
            schemaRetriever: createInProcessSchemaRetriever(createHashingEmbedder()),
            apps,
            skills: allSkills.map((s) => ({
              name: s.name,
              description: s.description,
              path: s.path,
              agent: s.agent,
            })),
            subagents: subagentsList.map((sa) => ({
              name: sa.name,
              description: sa.description,
              baseAgent: sa.baseAgent,
              tools: sa.tools,
              prompt: sa.prompt,
              path: sa.path,
            })),
            loadedTools: loadedTools.current,
            onLoadedToolsChange: (names) => {
              logger.info('agent.tools.loaded', { names });
            },
            sessionId: sessionId.current ?? undefined,
            todoStore: todoStore.current,
            onTodosChange: (todos) => setSessionTodos(todos),
            backgroundJobs: backgroundJobs.current,
            contextLimit: contextLimit ?? undefined,
            previousSummary: rollingSummary.current ?? undefined,
            onCompaction: (event) => {
              if (event.summary) {
                rollingSummary.current = event.summary;
                // Persist the summary as a hidden message so /resume can
                // re-seed `rollingSummary` and the next agent run gets the
                // same continuity it would have had without restarting.
                void persistMessage(MessageRole.ASSISTANT, event.summary, {
                  summary: true,
                  finish: 'compaction',
                });
              }
              setEntries((p) => [
                ...p,
                {
                  kind: 'assistant',
                  text: `_Context compacted (${event.phase}, saved ~${event.savedTokens} tokens)._`,
                },
              ]);
              trackCompaction(telemetry, event.phase, event.savedTokens);
              logger.info('agent.compaction.applied', {
                phase: event.phase,
                saved: event.savedTokens,
                summaryLength: event.summary?.length ?? 0,
              });
            },
            registry: {
              datasourceRepo,
              usageRepo,
              getAttachState: (id) => attachedDatasources.get(id),
              attachDatasource: async (id) => {
                const ds = await datasourceRepo.findById(id);
                if (!ds) return { status: 'error' as const, error: `Datasource ${id} not found` };
                const state = await attachedDatasources.attach(ds);
                return {
                  status: state.status,
                  tables: state.status === 'attached' ? state.tables : undefined,
                  error: state.status === 'error' ? state.error : undefined,
                };
              },
              detachDatasource: async (id) => {
                const ds = await datasourceRepo.findById(id);
                if (ds) await attachedDatasources.detach(ds);
              },
              testDatasource: async (id) => {
                const ds = await datasourceRepo.findById(id);
                if (!ds) return { ok: false, error: `Datasource ${id} not found` };
                return attachedDatasources.test(ds);
              },
              listSkills: async () => {
                const skills = await listLocalSkills();
                return skills.map((s) => ({ name: s.name, description: s.description, path: s.path }));
              },
              readSkill: readLocalSkill,
            },
            onToolEvent: (event) => {
              handleToolEvent(event);
              // Privacy-safe action trace: spans + events with allowlisted attrs only.
              instrumentToolEvent(telemetry, event, toolSpans.current);
              if (event.status === 'running') toolCallCount += 1;
            },
            onToken: (delta) => {
              buffer += delta;
              setStreaming(buffer);
            },
            onStepStart: () => {
              // New tool-loop step: drop the previous step's transient status
              // narration so the live preview shows only the current phase
              // instead of accumulating "Phase 1/4 …Phase 1/4 …" run-ons.
              buffer = '';
              setStreaming('');
            },
          }),
        );
        trackTurnCompleted(telemetry, { mode: agent.id, durationMs, finishReason, toolCallCount });
        recordTurnTokens(telemetry, activeModelKey(), usage);
        const wasAborted = finishReason === 'aborted';
        if (finalText.length > 0) {
          // When aborted, surface the partial answer plus a marker so the
          // user knows the turn was cut short.
          const display = wasAborted ? `${finalText}\n\n_⏹ Interrupted by user._` : finalText;
          setEntries((p) => [...p, { kind: 'assistant', text: display }]);
          session.current.push({ role: 'assistant', content: finalText });
          const persisted = await persistMessage(MessageRole.ASSISTANT, finalText);
          // Track tokens + cost using models.dev catalog.
          try {
            const recorded = await UsageUseCase.trackAgentTurn(
              { usageRepo, modelCatalog },
              {
                sessionId: sessionId.current ?? undefined,
                messageId: persisted?.id,
                modelKey: activeModelKey(),
                usage,
                durationMs,
              },
            );
            setSessionTotals((t) => ({
              inputTokens: t.inputTokens + recorded.inputTokens,
              outputTokens: t.outputTokens + recorded.outputTokens,
              totalTokens: t.totalTokens + recorded.totalTokens,
              costUSD: t.costUSD + recorded.costUSD,
            }));
            setLastTurnInputTokens(recorded.inputTokens);
          } catch (err) {
            trackError(telemetry, 'usage.track', err instanceof Error ? err : new Error(String(err)));
            logger.error('usage.track.error', {
              message: err instanceof Error ? err.message : String(err),
            });
          }
        } else if (wasAborted) {
          // No partial text — still tell the user the abort registered.
          setEntries((p) => [...p, { kind: 'assistant', text: '_⏹ Interrupted before any output._' }]);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        trackError(telemetry, 'agent.turn', err instanceof Error ? err : new Error(message));
        logger.error('app.submit.error', { message });
        setEntries((p) => [...p, { kind: 'assistant', text: `[error] ${message}` }]);
      } finally {
        turnAbort.current = null;
        setStreaming('');
        setBusy(false);
      }
    },
    [
      busy,
      exit,
      handleToolEvent,
      datasourceSummaries,
      compute,
      llm,
      logger,
      activeModelKey,
      ensureSession,
      persistMessage,
      modelCatalog,
      usageRepo,
      pinnedAgent,
      sessionRepo,
      telemetry,
    ],
  );

  const tabs = useMemo(
    () => [
      { key: 'chat' as TabKey, label: 'Chat' },
      { key: 'results' as TabKey, label: 'Results', badge: resultsBadge && activeTab !== 'results' },
    ],
    [resultsBadge, activeTab],
  );

  if (overlay === 'models') {
    return (
      <ModelsOverlay
        onClose={() => setOverlay(null)}
        onSaved={(id) => {
          const label = activeProviderLabel(configStore);
          setProviderLabel(label);
          setOverlay(null);
          setEntries((p) => [...p, { kind: 'assistant', text: `Connected: ${label ?? id}` }]);
        }}
      />
    );
  }

  if (overlay === 'resume') {
    return (
      <ResumeOverlay
        onClose={() => setOverlay(null)}
        onResume={(id) => {
          setOverlay(null);
          void resumeSession(id);
        }}
      />
    );
  }

  if (overlay === 'datasources') {
    return (
      <DatasourcesOverlay
        onClose={() => setOverlay(null)}
        onAttached={(ds) => {
          if (sessionId.current) {
            void SessionUseCases.linkDatasource(
              { sessionRepo },
              { sessionId: sessionId.current, datasourceId: ds.id },
            ).catch((err) =>
              logger.error('session.linkDatasource.error', {
                message: err instanceof Error ? err.message : String(err),
              }),
            );
          }
        }}
      />
    );
  }

  if (overlay === 'context' && overlayContextSnapshot) {
    return (
      <ContextOverlay
        agent={activeAgent}
        modelLabel={providerLabel}
        contextLimit={contextLimit}
        lastTurnInputTokens={lastTurnInputTokens}
        messages={session.current}
        datasources={datasourceSummaries}
        apps={overlayContextSnapshot.apps}
        skills={overlayContextSnapshot.skills}
        subagents={overlayContextSnapshot.subagents}
        loadedTools={[...loadedTools.current]}
        onClose={() => {
          setOverlay(null);
          setOverlayContextSnapshot(null);
        }}
      />
    );
  }

  if (overlay === 'agents') {
    return <AgentsOverlay onClose={() => setOverlay(null)} />;
  }

  const agentStatus = busy
    ? `${streaming.length > 0 ? 'agent: streaming…' : 'agent: thinking…'}  (Ctrl+C to interrupt)`
    : null;

  return (
    <Box flexDirection="column" paddingX={1} height={termRows}>
      <Box flexShrink={0}>
        <Text color="cyan" bold>
          qwery
        </Text>
        <Text
          dimColor
        >{` · ${appVersion ? `v${appVersion}` : 'dev'}${gfsVersion ? ` (with GFS v${gfsVersion})` : ''}`}</Text>
      </Box>
      {layoutMode === 'split' ? (
        <Box flexDirection="row" flexGrow={1} overflow="hidden">
          <Box
            flexDirection="column"
            flexBasis={0}
            flexGrow={1}
            flexShrink={1}
            paddingRight={1}
            overflow="hidden"
          >
            <Box marginBottom={1} flexShrink={0}>
              <Text color="cyan" bold>
                Chat
              </Text>
            </Box>
            <Box flexDirection="column" flexGrow={1} flexShrink={1} overflow="hidden">
              <ChatView
                lines={chatLines}
                scrollOffset={chatScrollOffset}
                availableHeight={chatAvailableHeight}
              />
            </Box>
            <Box flexShrink={0} flexDirection="column">
              <Box minHeight={1}>
                {agentStatus ? <Text color="yellow">{agentStatus}</Text> : <Text> </Text>}
              </Box>
              <InputBar
                state={inputState}
                onChange={setInputState}
                onSubmit={submit}
                disabled={busy}
                history={history}
              />
              <StatusBar
                providerLabel={providerLabel}
                totals={sessionTotals}
                contextLimit={contextLimit}
                lastTurnInputTokens={lastTurnInputTokens}
                attachedDatasources={datasourceSummaries.length}
                agentLabel={activeAgent.label}
                agentPinned={pinnedAgent !== null}
                updateReady={hasStagedUpdate(updateOutcomes)}
              />
            </Box>
          </Box>
          <Box
            flexDirection="column"
            flexBasis={0}
            flexGrow={1}
            flexShrink={1}
            paddingLeft={1}
            borderStyle="single"
            borderTop={false}
            borderRight={false}
            borderBottom={false}
            borderColor="gray"
            overflow="hidden"
          >
            <Box marginBottom={1} flexShrink={0}>
              <Text color="cyan" bold>
                Results
              </Text>
              {resultsBadge && <Text color="cyan"> ●</Text>}
            </Box>
            <Box flexDirection="column" flexGrow={1} flexShrink={1} overflow="hidden">
              <ResultsView event={activeResult} mode={resultMode} />
            </Box>
          </Box>
        </Box>
      ) : (
        <>
          <Box flexShrink={0}>
            <TabBar active={activeTab} tabs={tabs} />
          </Box>
          <Box flexDirection="column" flexGrow={1} flexShrink={1} overflow="hidden">
            {activeTab === 'chat' ? (
              <ChatView
                lines={chatLines}
                scrollOffset={chatScrollOffset}
                availableHeight={chatAvailableHeight}
              />
            ) : (
              <ResultsView event={activeResult} mode={resultMode} />
            )}
          </Box>
          <Box flexShrink={0} flexDirection="column">
            <Box minHeight={1}>
              {agentStatus ? <Text color="yellow">{agentStatus}</Text> : <Text> </Text>}
            </Box>
            <InputBar
              state={inputState}
              onChange={setInputState}
              onSubmit={submit}
              disabled={busy}
              history={history}
            />
            <StatusBar
              providerLabel={providerLabel}
              totals={sessionTotals}
              contextLimit={contextLimit}
              lastTurnInputTokens={lastTurnInputTokens}
              attachedDatasources={datasourceSummaries.length}
              agentLabel={activeAgent.label}
              agentPinned={pinnedAgent !== null}
              updateReady={hasStagedUpdate(updateOutcomes)}
              todos={
                sessionTodos.length > 0
                  ? {
                      total: sessionTodos.length,
                      open: sessionTodos.filter((t) => t.status !== 'completed' && t.status !== 'cancelled')
                        .length,
                    }
                  : undefined
              }
            />
          </Box>
        </>
      )}
    </Box>
  );
}
