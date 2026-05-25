/**
 * Baked-in telemetry defaults for the open-source build.
 *
 * These values ship with qwery-core so telemetry works out of the box after a
 * plain install — no env setup required. They are all *public by design*:
 *   - the PostHog key is a write-only ingestion key (cannot read data back),
 *   - the Sentry DSN is meant to be embedded in clients,
 *   - the OTLP endpoint is a public collector ingest URL.
 *
 * Every value is overridable via environment variables (see `config.ts`) and the
 * whole system is disabled by `QWERY_TELEMETRY_ENABLED=false`. Leave a constant
 * as an empty string to keep that backend opt-in (env-only).
 */

/** PostHog project write-only ingestion key (dedicated open-source project). */
export const DEFAULT_POSTHOG_KEY = 'phc_1wb3ErK7DJgNWrGiZmH8mMUaPfEwSCuYJwOOT8JogJF';

/** PostHog ingestion host. */
export const DEFAULT_POSTHOG_HOST = 'https://us.i.posthog.com';

/** Sentry DSN for the open-source project (public, client-embeddable). */
export const DEFAULT_SENTRY_DSN =
  'https://1c316a07078526e18f9b9611abc69a21@o4510563723968512.ingest.us.sentry.io/4511445682749441';

/** Default OTLP/HTTP collector endpoint. Empty keeps OTel opt-in. */
export const DEFAULT_OTLP_ENDPOINT = '';
