import type { Span, SpanContext } from '@opentelemetry/api';

export interface OtelTelemetryManagerOptions {
  exportAppTelemetry?: boolean;
  exportMetrics?: boolean;
}

export interface TelemetryManagerInterface {
  getSessionId(): string;
  init(): Promise<void>;
  shutdown(): Promise<void>;
  startSpan(name: string, attributes?: Record<string, unknown>): Span;
  startSpanWithLinks(
    name: string,
    attributes?: Record<string, unknown>,
    parentSpanContexts?: Array<{
      context: SpanContext;
      attributes?: Record<string, string | number | boolean>;
    }>,
  ): Span;
  endSpan(span: Span, success: boolean): void;
  captureEvent(options: {
    name: string;
    attributes?: Record<string, unknown>;
  }): void;
  recordCommandDuration(
    durationMs: number,
    attributes?: Record<string, string | number | boolean>,
  ): void;
  recordCommandCount(
    attributes?: Record<string, string | number | boolean>,
  ): void;
  recordCommandError(
    attributes?: Record<string, string | number | boolean>,
  ): void;
  recordCommandSuccess(
    attributes?: Record<string, string | number | boolean>,
  ): void;
  recordTokenUsage(
    promptTokens: number,
    completionTokens: number,
    attributes?: Record<string, string | number | boolean>,
  ): void;
  recordQueryDuration(
    durationMs: number,
    attributes?: Record<string, string | number | boolean>,
  ): void;
  recordQueryCount(
    attributes?: Record<string, string | number | boolean>,
  ): void;
  recordQueryRowsReturned(
    rowCount: number,
    attributes?: Record<string, string | number | boolean>,
  ): void;
  recordMessageDuration(
    durationMs: number,
    attributes?: Record<string, string | number | boolean>,
  ): void;
  recordAgentTokenUsage(
    promptTokens: number,
    completionTokens: number,
    attributes?: Record<string, string | number | boolean>,
  ): void;
}

// TelemetryManager type alias for backward compatibility
export type TelemetryManager = TelemetryManagerInterface;
export type TelemetryManagerOptions = OtelTelemetryManagerOptions;
