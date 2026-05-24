import type { TelemetryAttributes, TelemetrySpan, TokenUsage } from '@qwery/domain';

/**
 * A single telemetry backend (PostHog, OTel, Sentry). Every method is optional:
 * a backend implements only what it supports (e.g. Sentry only `trackError`,
 * OTel only spans/metrics). The composite manager fans every facade call out to
 * the backends that implement it.
 */
export interface TelemetryBackend {
  readonly name: string;
  trackEvent?(name: string, properties?: TelemetryAttributes): void;
  trackError?(error: Error, context?: TelemetryAttributes): void;
  identify?(distinctId: string, traits?: TelemetryAttributes): void;
  /** Returns a real span, or undefined if this backend does not trace. */
  startSpan?(name: string, attributes?: TelemetryAttributes): TelemetrySpan | undefined;
  /**
   * Runs `fn` with `name` as the *active* span so any span started inside `fn`
   * nests under it. Tracing backends implement this to get a proper call tree;
   * the manager falls back to a flat start/end when no backend provides it.
   */
  withSpan?<T>(
    name: string,
    attributes: TelemetryAttributes | undefined,
    fn: (span: TelemetrySpan) => Promise<T>,
  ): Promise<T>;
  recordTokenUsage?(usage: TokenUsage): void;
  flush?(): Promise<void>;
  shutdown?(): Promise<void>;
}

/** Strips `undefined` values so backends receive clean attribute maps. */
export function cleanAttributes(attributes?: TelemetryAttributes): Record<string, string | number | boolean> {
  const result: Record<string, string | number | boolean> = {};
  if (!attributes) return result;
  for (const [key, value] of Object.entries(attributes)) {
    if (value !== undefined) result[key] = value;
  }
  return result;
}
