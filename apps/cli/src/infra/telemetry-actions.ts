/**
 * Telemetry redaction layer — the SINGLE place that decides what action data
 * leaves the process. Every telemetry call from the TUI goes through a helper
 * here so the privacy contract lives in one auditable file (enforced by
 * `tooling/privacy-check.ts`).
 *
 * Allowlist discipline: we build attribute maps from a fixed set of SAFE scalars
 * (enums, counts, durations, booleans, model/provider ids). We never read the
 * personal-data-bearing fields of a tool result — no statements, no rows, no
 * file locations, no shell input, no rendered output, no error wording.
 */

import type { Telemetry, TelemetryAttributes, TelemetrySpan, ToolEvent } from '@qwery/domain';
import { AGENT_EVENTS, CLI_EVENTS } from '@qwery/telemetry/events';

/** Slash commands we recognise — a closed vocabulary, never user content. */
const KNOWN_COMMANDS = new Set([
  '/models',
  '/datasources',
  '/agents',
  '/context',
  '/data',
  '/code',
  '/auto',
  '/layout',
  '/split',
  '/focus',
  '/resume',
  '/clear',
  '/help',
  '/logs',
  '/update',
  '/quit',
  '/exit',
]);

/** Fixed operation labels for error reporting — safe, not user-derived. */
export type TelemetryOp =
  | 'agent.turn'
  | 'usage.track'
  | 'update.check'
  | 'datasource.attach'
  | 'shell.run'
  | 'session.init';

export function trackCommand(telemetry: Telemetry, raw: string): void {
  const command = raw.split(/\s+/)[0]?.toLowerCase() ?? '';
  if (KNOWN_COMMANDS.has(command)) {
    telemetry.trackEvent(CLI_EVENTS.COMMAND_EXECUTED, { command });
  }
}

export function trackShell(telemetry: Telemetry, exitCode: number): void {
  telemetry.trackEvent(CLI_EVENTS.SHELL_EXECUTED, { exit_code: exitCode });
}

export function trackDatasource(
  telemetry: Telemetry,
  action: 'attach' | 'detach' | 'test',
  driver: string,
  success: boolean,
): void {
  const event =
    action === 'attach'
      ? CLI_EVENTS.DATASOURCE_ATTACHED
      : action === 'detach'
        ? CLI_EVENTS.DATASOURCE_DETACHED
        : CLI_EVENTS.DATASOURCE_TESTED;
  // `driver` is the connector kind (e.g. postgresql) — config metadata, not a
  // datasource name, host or credential.
  telemetry.trackEvent(event, { driver, success });
}

export function trackUpdateCheck(telemetry: Telemetry, success: boolean, stagedCount: number): void {
  telemetry.trackEvent(CLI_EVENTS.UPDATE_CHECKED, { success, staged_count: stagedCount });
}

export function trackCompaction(telemetry: Telemetry, phase: string, savedTokens: number): void {
  telemetry.trackEvent(AGENT_EVENTS.COMPACTION_APPLIED, { phase, saved_tokens: savedTokens });
}

export function trackTurnCompleted(
  telemetry: Telemetry,
  attrs: { mode: string; durationMs: number; finishReason: string | null; toolCallCount: number },
): void {
  telemetry.trackEvent(AGENT_EVENTS.TURN_COMPLETED, {
    mode: attrs.mode,
    duration_ms: attrs.durationMs,
    finish_reason: attrs.finishReason ?? 'unknown',
    tool_call_count: attrs.toolCallCount,
  });
}

export function recordTurnTokens(
  telemetry: Telemetry,
  modelKey: string,
  usage: { inputTokens?: number; outputTokens?: number; totalTokens?: number },
): void {
  const slash = modelKey.indexOf('/');
  const provider = slash === -1 ? modelKey : modelKey.slice(0, slash);
  const model = slash === -1 ? 'unknown' : modelKey.slice(slash + 1);
  telemetry.recordTokenUsage({
    provider,
    model,
    promptTokens: usage.inputTokens ?? 0,
    completionTokens: usage.outputTokens ?? 0,
    totalTokens: usage.totalTokens,
  });
}

export function trackError(telemetry: Telemetry, op: TelemetryOp, error: Error): void {
  // Category-only: the facade forwards error.name + the op label; backends are
  // wired to drop the wording/stack (see Sentry beforeSend, PostHog/OTel).
  telemetry.trackError(error, { op });
}

/**
 * Builds the SAFE attribute map for a tool event. This is the privacy chokepoint
 * for the agent: it reads only counts/durations/enums/booleans from the result —
 * never the underlying content. Adding a new result kind means explicitly
 * choosing which safe scalars (if any) to surface.
 */
export function safeToolAttributes(event: ToolEvent): TelemetryAttributes {
  const attrs: TelemetryAttributes = { tool: event.name, status: event.status };
  if (event.endedAt) attrs.duration_ms = event.endedAt - event.startedAt;

  const out = event.output;
  if (!out) return attrs;

  switch (out.kind) {
    case 'runQuery':
    case 'present':
      attrs.row_count = out.result.rowCount;
      break;
    case 'describeQuery':
      attrs.column_count = out.schema.columns?.length ?? 0;
      break;
    case 'schema':
      break;
    case 'bash':
      attrs.exit_code = out.exitCode;
      break;
    case 'read':
      attrs.bytes = out.bytes;
      attrs.truncated = out.truncated;
      break;
    case 'write':
      attrs.bytes = out.bytes;
      break;
    case 'edit':
      attrs.applied_edits = out.appliedEdits;
      attrs.bytes_after = out.bytesAfter;
      break;
    case 'agent':
      // Subagent name is intentionally omitted; only duration + token count.
      attrs.duration_ms = out.durationMs;
      attrs.tokens = out.tokens;
      break;
    case 'taskStatus':
      attrs.state = out.state;
      break;
    case 'todoWrite':
    case 'todoRead':
      attrs.todo_count = out.todos.length;
      break;
    case 'validateQuery':
      attrs.available = out.available;
      attrs.valid = out.valid;
      attrs.violation_count = out.violations.length;
      break;
    case 'searchSchema':
      attrs.available = out.available;
      attrs.table_count = out.tables;
      break;
    case 'error':
      // Never include the error wording.
      break;
  }
  return attrs;
}

/**
 * Drives spans + analytics for a tool event. On `running` it opens a child span
 * (nested under the active turn span) and emits an invoked event; on `done`/
 * `error` it closes the span with safe attributes and emits the outcome event.
 */
export function instrumentToolEvent(
  telemetry: Telemetry,
  event: ToolEvent,
  spans: Map<string, TelemetrySpan>,
): void {
  if (event.status === 'running') {
    spans.set(event.id, telemetry.startSpan(`agent.tool.${event.name}`, { tool: event.name }));
    telemetry.trackEvent(AGENT_EVENTS.TOOL_INVOKED, { tool: event.name });
    return;
  }

  const attrs = safeToolAttributes(event);
  const span = spans.get(event.id);
  if (span) {
    for (const [key, value] of Object.entries(attrs)) span.setAttribute(key, value);
    span.end(event.status === 'done');
    spans.delete(event.id);
  }
  telemetry.trackEvent(
    event.status === 'done' ? AGENT_EVENTS.TOOL_COMPLETED : AGENT_EVENTS.TOOL_FAILED,
    attrs,
  );
}
