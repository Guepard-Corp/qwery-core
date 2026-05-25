import { NULL_TELEMETRY_SPAN, type Telemetry, type TelemetrySpan } from '@qwery/domain';
import type { TelemetryBackend } from './backend';
import type { ResolvedTelemetryConfig } from './config';

/** Runs a backend call, swallowing any error: telemetry must never throw. */
function safe(debug: boolean, backend: string, fn: () => void): void {
  try {
    fn();
  } catch (error) {
    if (debug) console.error(`[telemetry] ${backend} call failed:`, error);
  }
}

/** Awaits a promise but never rejects, with a hard timeout for shutdown paths. */
async function safeAsync(
  debug: boolean,
  backend: string,
  fn: () => Promise<void>,
  timeoutMs: number,
): Promise<void> {
  try {
    await Promise.race([fn(), new Promise<void>((resolve) => setTimeout(resolve, timeoutMs))]);
  } catch (error) {
    if (debug) console.error(`[telemetry] ${backend} async call failed:`, error);
  }
}

/**
 * Composes several backends behind the single `Telemetry` facade. Every call is
 * fanned out to the relevant backends and is fire-and-forget — failures are
 * isolated per backend and never propagate to the caller.
 */
export function createTelemetryManager(
  backends: TelemetryBackend[],
  config: ResolvedTelemetryConfig,
): Telemetry {
  const { debug } = config;

  const startSpan = (
    name: string,
    attributes?: Record<string, string | number | boolean | undefined>,
  ): TelemetrySpan => {
    for (const backend of backends) {
      if (!backend.startSpan) continue;
      try {
        const span = backend.startSpan(name, attributes);
        if (span) return span;
      } catch (error) {
        if (debug) console.error(`[telemetry] ${backend.name} startSpan failed:`, error);
      }
    }
    return NULL_TELEMETRY_SPAN;
  };

  return {
    trackEvent(name, properties) {
      for (const backend of backends) {
        if (backend.trackEvent) safe(debug, backend.name, () => backend.trackEvent?.(name, properties));
      }
    },
    trackError(error, context) {
      for (const backend of backends) {
        if (backend.trackError) safe(debug, backend.name, () => backend.trackError?.(error, context));
      }
    },
    identify(distinctId, traits) {
      for (const backend of backends) {
        if (backend.identify) safe(debug, backend.name, () => backend.identify?.(distinctId, traits));
      }
    },
    recordTokenUsage(usage) {
      for (const backend of backends) {
        if (backend.recordTokenUsage) safe(debug, backend.name, () => backend.recordTokenUsage?.(usage));
      }
    },
    startSpan,
    async withSpan(name, attributes, fn) {
      // Prefer a backend that activates span context (OTel) so nested spans
      // started inside `fn` become children; otherwise fall back to flat start/end.
      const tracing = backends.find((b) => b.withSpan);
      if (tracing?.withSpan) {
        return tracing.withSpan(name, attributes, fn);
      }
      const span = startSpan(name, attributes);
      try {
        const result = await fn(span);
        span.end(true);
        return result;
      } catch (error) {
        if (error instanceof Error) span.recordError(error);
        span.end(false);
        throw error;
      }
    },
    async flush() {
      await Promise.allSettled(
        backends.map((backend) =>
          backend.flush
            ? safeAsync(debug, backend.name, backend.flush.bind(backend), 3000)
            : Promise.resolve(),
        ),
      );
    },
    async shutdown() {
      await Promise.allSettled(
        backends.map((backend) =>
          backend.shutdown
            ? safeAsync(debug, backend.name, backend.shutdown.bind(backend), 3000)
            : Promise.resolve(),
        ),
      );
    },
  };
}
