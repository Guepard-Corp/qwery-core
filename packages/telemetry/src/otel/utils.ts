import type { OtelTelemetryManager } from './manager';
import type { Span } from '@opentelemetry/api';
import { CLI_EVENTS } from '../events/cli.events';
import { WEB_EVENTS } from '../events/web.events';
import { DESKTOP_EVENTS } from '../events/desktop.events';

/**
 * Generic workspace context interface
 * Can be implemented by CLI, web, or desktop apps
 */
export interface WorkspaceContext {
  userId?: string;
  organizationId?: string;
  projectId?: string;
}

/**
 * Command/action context for instrumentation
 */
export interface ActionContext {
  actionName: string;
  actionGroup: string;
  actionType: string;
  args?: Record<string, unknown>;
  workspace?: WorkspaceContext;
  appType: 'cli' | 'web' | 'desktop';
  mode?: string; // e.g., 'interactive', 'command', 'browser', 'electron'
}

/**
 * Creates standardized attributes for spans and metrics
 * Works across CLI, web, and desktop apps
 */
export function createActionAttributes(
  context: ActionContext,
  additionalAttributes?: Record<string, unknown>,
): Record<string, string | number | boolean> {
  const attributes: Record<string, string | number | boolean> = {
    [`${context.appType}.action.name`]: context.actionName,
    [`${context.appType}.action.group`]: context.actionGroup,
    [`${context.appType}.action.type`]: context.actionType,
    [`${context.appType}.app.type`]: context.appType,
  };

  if (context.mode) {
    attributes[`${context.appType}.mode`] = context.mode;
  }

  if (context.workspace?.userId) {
    attributes[`${context.appType}.workspace.user_id`] =
      context.workspace.userId;
  }
  if (context.workspace?.organizationId) {
    attributes[`${context.appType}.workspace.organization_id`] =
      context.workspace.organizationId;
  }
  if (context.workspace?.projectId) {
    attributes[`${context.appType}.workspace.project_id`] =
      context.workspace.projectId;
  }

  if (context.args) {
    try {
      attributes[`${context.appType}.action.args`] = JSON.stringify(
        context.args,
      );
    } catch {
      attributes[`${context.appType}.action.args`] = String(context.args);
    }
  }

  // Merge additional attributes
  if (additionalAttributes) {
    for (const [key, value] of Object.entries(additionalAttributes)) {
      if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
      ) {
        attributes[key] = value;
      }
    }
  }

  return attributes;
}

/**
 * Parses action name into group and type
 * Example: "project.list" -> { group: "project", type: "list" }
 */
export function parseActionName(actionName: string): {
  group: string;
  type: string;
} {
  const parts = actionName.split('.');
  if (parts.length >= 2) {
    return {
      group: parts[0]!,
      type: parts.slice(1).join('.'),
    };
  }
  return {
    group: actionName,
    type: 'unknown',
  };
}

/**
 * Generic wrapper for instrumenting actions with telemetry
 * Works for CLI commands, web actions, and desktop operations
 *
 * @example
 * ```typescript
 * await withActionSpan(
 *   telemetry,
 *   {
 *     actionName: 'project.list',
 *     appType: 'cli',
 *     mode: 'command',
 *     workspace: { userId: 'user123' },
 *   },
 *   async (span) => {
 *     // Action logic here
 *     telemetry.captureEvent({ name: 'action.validated' });
 *     return result;
 *   }
 * );
 * ```
 */
export async function withActionSpan<T>(
  telemetry: OtelTelemetryManager,
  context: ActionContext,
  actionFn: (span: Span) => Promise<T>,
): Promise<T> {
  const startTime = Date.now();
  const { group, type } = parseActionName(context.actionName);
  const sessionId = telemetry.getSessionId();

  const fullContext: ActionContext = {
    ...context,
    actionGroup: group,
    actionType: type,
  };

  const attributes = createActionAttributes(fullContext, {
    [`${context.appType}.session.id`]: sessionId,
  });

  // Start span
  const spanName = `${context.appType}.action.${context.actionName}`;
  const span = telemetry.startSpan(spanName, attributes);

  // Record action started event (use event constants)
  const startedEventName =
    context.appType === 'cli'
      ? CLI_EVENTS.COMMAND_STARTED
      : context.appType === 'web'
        ? WEB_EVENTS.PAGE_LOAD
        : DESKTOP_EVENTS.WINDOW_OPEN;

  telemetry.captureEvent({
    name: startedEventName,
    attributes,
  });

  // Record action count metric (if CLI)
  if (context.appType === 'cli') {
    telemetry.recordCommandCount(attributes);
  }

  try {
    // Execute action
    const result = await actionFn(span);

    // Calculate duration
    const duration = Date.now() - startTime;

    // Record success metrics
    if (context.appType === 'cli') {
      telemetry.recordCommandSuccess(attributes);
      telemetry.recordCommandDuration(duration, attributes);
    }

    // Record completion event (use event constants)
    const completedEventName =
      context.appType === 'cli'
        ? CLI_EVENTS.COMMAND_COMPLETED
        : context.appType === 'web'
          ? WEB_EVENTS.PAGE_VIEW
          : DESKTOP_EVENTS.COMMAND_COMPLETE;

    telemetry.captureEvent({
      name: completedEventName,
      attributes: {
        ...attributes,
        [`${context.appType}.action.duration_ms`]: String(duration),
        [`${context.appType}.action.status`]: 'success',
      },
    });

    // End span successfully
    telemetry.endSpan(span, true);

    return result;
  } catch (error) {
    // Calculate duration
    const duration = Date.now() - startTime;

    // Record error metrics
    if (context.appType === 'cli') {
      telemetry.recordCommandError(attributes);
      telemetry.recordCommandDuration(duration, attributes);
    }

    // Record error event
    const errorAttributes: Record<string, string | number | boolean> = {
      ...attributes,
      [`${context.appType}.action.duration_ms`]: String(duration),
      [`${context.appType}.action.status`]: 'error',
    };

    if (error instanceof Error) {
      errorAttributes['error.type'] = error.name;
      errorAttributes['error.message'] = error.message;
      if (error.stack) {
        errorAttributes['error.stack'] = error.stack;
      }
    } else {
      errorAttributes['error.message'] = String(error);
    }

    // Record error event (use event constants)
    const errorEventName =
      context.appType === 'cli'
        ? CLI_EVENTS.ERROR_EXECUTION
        : context.appType === 'web'
          ? WEB_EVENTS.ERROR_JS
          : DESKTOP_EVENTS.ERROR_ELECTRON;

    telemetry.captureEvent({
      name: errorEventName,
      attributes: errorAttributes,
    });

    // End span with error
    telemetry.endSpan(span, false);

    throw error;
  }
}

/**
 * Records query execution metrics
 * Works across all app types
 */
export function recordQueryMetrics(
  telemetry: OtelTelemetryManager,
  appType: 'cli' | 'web' | 'desktop',
  workspace: WorkspaceContext | undefined,
  durationMs: number,
  rowCount: number,
  additionalAttributes?: Record<string, string | number | boolean>,
): void {
  const sessionId = telemetry.getSessionId();
  const attributes = createActionAttributes(
    {
      actionName: 'query.execute',
      actionGroup: 'query',
      actionType: 'execute',
      workspace,
      appType,
    },
    {
      [`${appType}.session.id`]: sessionId,
      ...additionalAttributes,
    },
  );

  telemetry.recordQueryDuration(durationMs, attributes);
  telemetry.recordQueryCount(attributes);
  telemetry.recordQueryRowsReturned(rowCount, attributes);

  // Send as event for dual tracking (PostHog + OTel span event)
  telemetry.captureEvent({
    name: 'query.execute',
    attributes: {
      ...attributes,
      duration_ms: durationMs,
      row_count: rowCount,
    },
  });
}

/**
 * Records AI token usage metrics
 * Works across all app types
 */
export function recordTokenUsage(
  telemetry: OtelTelemetryManager,
  appType: 'cli' | 'web' | 'desktop',
  workspace: WorkspaceContext | undefined,
  promptTokens: number,
  completionTokens: number,
  additionalAttributes?: Record<string, string | number | boolean>,
): void {
  const sessionId = telemetry.getSessionId();
  const attributes = createActionAttributes(
    {
      actionName: 'ai.invoke',
      actionGroup: 'ai',
      actionType: 'invoke',
      workspace,
      appType,
    },
    {
      [`${appType}.session.id`]: sessionId,
      ...additionalAttributes,
    },
  );

  telemetry.recordTokenUsage(promptTokens, completionTokens, attributes);
}

