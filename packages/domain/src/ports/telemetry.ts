/**
 * Telemetry port — the single, vendor-neutral entry point the rest of the
 * codebase uses for analytics, tracing and error reporting.
 *
 * Application/TUI code depends only on this `Telemetry` interface (injected via
 * the composition root). The concrete `@qwery/telemetry` package fans every
 * call out to whichever backends are enabled (PostHog, OpenTelemetry, Sentry)
 * behind this facade — so no call site ever imports a vendor SDK directly.
 *
 * Every method is fire-and-forget and MUST NOT throw: telemetry can never block
 * or crash the agent. Flushing happens explicitly via `flush`/`shutdown` at the
 * composition root (before process exit).
 */

/** Attribute/property value types accepted across all backends. */
export type TelemetryValue = string | number | boolean | undefined;

export type TelemetryAttributes = Record<string, TelemetryValue>;

/** LLM token accounting, recorded as OTel metrics and analytics properties. */
export interface TokenUsage {
  model: string;
  provider: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens?: number;
}

/**
 * A unit of work being traced. Obtained from `Telemetry.startSpan`; callers end
 * it exactly once. No-op when no tracing backend is active.
 */
export interface TelemetrySpan {
  setAttribute(key: string, value: TelemetryValue): void;
  recordError(error: Error): void;
  /** Ends the span. `success` maps to the span status (defaults to true). */
  end(success?: boolean): void;
}

export interface Telemetry {
  /** Product-analytics event (PostHog) + span event on the active trace. */
  trackEvent(name: string, properties?: TelemetryAttributes): void;

  /** Reports an exception to Sentry and the active trace. */
  trackError(error: Error, context?: TelemetryAttributes): void;

  /** Associates subsequent events with a (anonymous) distinct id. */
  identify(distinctId: string, traits?: TelemetryAttributes): void;

  /** Starts a trace span. Returns a no-op span when tracing is off. */
  startSpan(name: string, attributes?: TelemetryAttributes): TelemetrySpan;

  /**
   * Runs `fn` inside a span, ending it automatically (error status on throw).
   * Preferred over manual start/end for request-scoped work.
   */
  withSpan<T>(
    name: string,
    attributes: TelemetryAttributes,
    fn: (span: TelemetrySpan) => Promise<T>,
  ): Promise<T>;

  /** Records LLM token usage as metrics + an analytics event. */
  recordTokenUsage(usage: TokenUsage): void;

  /** Flushes buffered events to all backends without tearing them down. */
  flush(): Promise<void>;

  /** Flushes and shuts every backend down. Call once, before process exit. */
  shutdown(): Promise<void>;
}

/** No-op span used by `NullTelemetry` and disabled tracing backends. */
export const NULL_TELEMETRY_SPAN: TelemetrySpan = {
  setAttribute: () => undefined,
  recordError: () => undefined,
  end: () => undefined,
};

/**
 * A `Telemetry` that does nothing — the default when telemetry is disabled or
 * no provider is configured. Keeps call sites free of null checks.
 */
export const NullTelemetry: Telemetry = {
  trackEvent: () => undefined,
  trackError: () => undefined,
  identify: () => undefined,
  startSpan: () => NULL_TELEMETRY_SPAN,
  withSpan: (_name, _attributes, fn) => fn(NULL_TELEMETRY_SPAN),
  recordTokenUsage: () => undefined,
  flush: () => Promise.resolve(),
  shutdown: () => Promise.resolve(),
};
