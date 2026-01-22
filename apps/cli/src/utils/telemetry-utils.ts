import type { CliContainer } from '../container/cli-container';
import type { TelemetryManager } from '@qwery/telemetry/otel';
import type { Span } from '@opentelemetry/api';
import {
  withActionSpan,
  recordQueryMetrics as recordQueryMetricsGeneric,
  recordTokenUsage as recordTokenUsageGeneric,
  type ActionContext,
  type WorkspaceContext,
} from '@qwery/telemetry/otel';
import { CLI_EVENTS } from '@qwery/telemetry/events/cli.events';

// Re-export CLI_EVENTS for convenience
export { CLI_EVENTS };

/**
 * Extracts workspace context from CLI container
 */
export function getWorkspaceContext(container: CliContainer): WorkspaceContext {
  const workspace = container.getWorkspace();
  return {
    userId: workspace?.userId,
    organizationId: workspace?.organizationId,
    projectId: workspace?.projectId,
  };
}

/**
 * Wraps a CLI command execution with telemetry instrumentation
 *
 * @example
 * ```typescript
 * await withCommandSpan(
 *   container.telemetry,
 *   container,
 *   'project.list',
 *   { format: 'json' },
 *   'command',
 *   async (span) => {
 *     // Command logic here
 *     return result;
 *   }
 * );
 * ```
 */
export async function withCommandSpan<T>(
  telemetry: TelemetryManager,
  container: CliContainer,
  commandName: string,
  args: Record<string, unknown> | undefined,
  mode: 'interactive' | 'command',
  commandFn: (span: Span) => Promise<T>,
): Promise<T> {
  const workspace = getWorkspaceContext(container);

  const context: ActionContext = {
    actionName: commandName,
    actionGroup: '', // Will be parsed by withActionSpan
    actionType: '', // Will be parsed by withActionSpan
    args,
    workspace,
    appType: 'cli',
    mode,
  };

  return withActionSpan(telemetry, context, commandFn);
}

/**
 * Records query execution metrics for CLI
 */
export function recordQueryMetrics(
  telemetry: TelemetryManager,
  container: CliContainer,
  durationMs: number,
  rowCount: number,
  additionalAttributes?: Record<string, string | number | boolean>,
): void {
  const workspace = getWorkspaceContext(container);
  recordQueryMetricsGeneric(
    telemetry,
    'cli',
    workspace,
    durationMs,
    rowCount,
    additionalAttributes,
  );
}

/**
 * Records AI token usage metrics for CLI
 */
export function recordTokenUsage(
  telemetry: TelemetryManager,
  container: CliContainer,
  promptTokens: number,
  completionTokens: number,
  additionalAttributes?: Record<string, string | number | boolean>,
): void {
  const workspace = getWorkspaceContext(container);
  recordTokenUsageGeneric(
    telemetry,
    'cli',
    workspace,
    promptTokens,
    completionTokens,
    additionalAttributes,
  );
}
