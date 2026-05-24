/**
 * `@qwery/telemetry` — the single entry point for all telemetry in qwery.
 *
 * `createTelemetry()` builds one `Telemetry` facade that fans every call out to
 * whichever backends the environment enables (PostHog, OpenTelemetry, Sentry).
 * Call sites depend only on the `Telemetry` interface from `@qwery/domain` and
 * receive it via dependency injection — they never touch a vendor SDK.
 *
 * @example
 * const telemetry = createTelemetry({ serviceName: 'qwery-cli', distinctId });
 * telemetry.trackEvent('session.started');
 * await telemetry.withSpan('query.run', { sql }, async () => runQuery());
 * await telemetry.shutdown(); // before process exit
 */
import { NullTelemetry, type Telemetry } from '@qwery/domain';
import type { TelemetryBackend } from './backend';
import { resolveTelemetryConfig, type TelemetryOptions } from './config';
import { createOtelBackend } from './providers/otel';
import { createPostHogBackend } from './providers/posthog';
import { createSentryBackend } from './providers/sentry';
import { createTelemetryManager } from './telemetry-manager';

export function createTelemetry(options?: TelemetryOptions): Telemetry {
  const config = resolveTelemetryConfig(options);
  if (!config.enabled) return NullTelemetry;

  const backends: TelemetryBackend[] = [];
  if (config.otel) backends.push(createOtelBackend(config.otel, config.serviceName));
  if (config.posthog) backends.push(createPostHogBackend(config.posthog, config.distinctId));
  if (config.sentry) backends.push(createSentryBackend(config.sentry, config.serviceName));

  if (backends.length === 0) {
    if (config.debug) console.error('[telemetry] enabled but no backend configured; using no-op.');
    return NullTelemetry;
  }

  return createTelemetryManager(backends, config);
}

export type {
  Telemetry,
  TelemetryAttributes,
  TelemetrySpan,
  TelemetryValue,
  TokenUsage,
} from '@qwery/domain';
export { NullTelemetry } from '@qwery/domain';
export type { TelemetryBackend } from './backend';
export type { ResolvedTelemetryConfig, TelemetryOptions } from './config';
export { resolveTelemetryConfig } from './config';
