/**
 * Telemetry configuration.
 *
 * Each backend uses its environment override if set, otherwise the baked-in
 * open-source default from `defaults.ts` — so a plain install reports telemetry
 * out of the box. A backend stays off only when both its env var and its default
 * are empty. The global kill-switch `QWERY_TELEMETRY_ENABLED=false` disables
 * everything regardless.
 */

import {
  DEFAULT_OTLP_ENDPOINT,
  DEFAULT_POSTHOG_HOST,
  DEFAULT_POSTHOG_KEY,
  DEFAULT_SENTRY_DSN,
} from './defaults';

export interface PostHogConfig {
  apiKey: string;
  host: string;
}

export interface OtelConfig {
  /** OTLP/HTTP endpoint, e.g. http://localhost:4318 */
  endpoint: string;
  /** Whether to also export metrics (token usage, durations). */
  exportMetrics: boolean;
}

export interface SentryConfig {
  dsn: string;
}

export interface ResolvedTelemetryConfig {
  enabled: boolean;
  debug: boolean;
  serviceName: string;
  /** Stable, anonymous identifier supplied by the composition root. */
  distinctId: string;
  posthog?: PostHogConfig;
  otel?: OtelConfig;
  sentry?: SentryConfig;
}

export interface TelemetryOptions {
  serviceName?: string;
  distinctId?: string;
}

const isFalse = (value: string | undefined): boolean => value === 'false' || value === '0';
const isTrue = (value: string | undefined): boolean => value === 'true' || value === '1';

export function resolveTelemetryConfig(options?: TelemetryOptions): ResolvedTelemetryConfig {
  const enabled = !isFalse(process.env.QWERY_TELEMETRY_ENABLED);
  const debug = isTrue(process.env.QWERY_TELEMETRY_DEBUG);
  const serviceName = options?.serviceName ?? process.env.QWERY_TELEMETRY_SERVICE_NAME ?? 'qwery-cli';
  const distinctId = options?.distinctId ?? 'anonymous';

  if (!enabled) {
    return { enabled: false, debug, serviceName, distinctId };
  }

  // Each backend: env override first, then the baked-in OSS default.
  const posthogKey = process.env.QWERY_POSTHOG_KEY ?? process.env.POSTHOG_KEY ?? DEFAULT_POSTHOG_KEY;
  const posthog: PostHogConfig | undefined = posthogKey
    ? {
        apiKey: posthogKey,
        host: process.env.QWERY_POSTHOG_HOST ?? process.env.POSTHOG_HOST ?? DEFAULT_POSTHOG_HOST,
      }
    : undefined;

  const otlpEndpoint = (process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? DEFAULT_OTLP_ENDPOINT)
    .trim()
    .replace(/^["']|["']$/g, '');
  const otel: OtelConfig | undefined = otlpEndpoint
    ? { endpoint: otlpEndpoint, exportMetrics: !isFalse(process.env.QWERY_EXPORT_METRICS) }
    : undefined;

  const sentryDsn = process.env.SENTRY_DSN ?? process.env.QWERY_SENTRY_DSN ?? DEFAULT_SENTRY_DSN;
  const sentry: SentryConfig | undefined = sentryDsn ? { dsn: sentryDsn } : undefined;

  return { enabled: true, debug, serviceName, distinctId, posthog, otel, sentry };
}
