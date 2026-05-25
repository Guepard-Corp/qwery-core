import * as Sentry from '@sentry/node';
import type { TelemetryBackend } from '../backend';
import type { SentryConfig } from '../config';

/**
 * Sentry backend — exception reporting, category-only.
 *
 * Privacy: error messages and stack traces can carry SQL, file paths (with
 * usernames), hostnames and other personal data, so `beforeSend` strips them.
 * What survives is the exception *type*, the `op` tag (which operation failed)
 * and our own tags — never free-form content. `serverName` is forced to the
 * service name so the host machine name never leaks either.
 */
export function createSentryBackend(config: SentryConfig, serviceName: string): TelemetryBackend {
  Sentry.init({
    dsn: config.dsn,
    serverName: serviceName,
    sendDefaultPii: false,
    // Tracing is handled by the OTel backend; Sentry is errors-only here.
    tracesSampleRate: 0,
    beforeSend(event) {
      // Drop every channel that can carry personal data.
      event.message = undefined;
      event.user = undefined;
      event.request = undefined;
      event.contexts = undefined;
      event.extra = undefined;
      event.breadcrumbs = undefined;
      if (event.exception?.values) {
        for (const value of event.exception.values) {
          value.value = ''; // exception message (may contain SQL / paths / hosts)
          value.stacktrace = undefined; // stack frames embed local file paths
        }
      }
      return event; // keeps exception.type + tags only
    },
  });

  return {
    name: 'sentry',
    trackError(error, context) {
      // `op` (a fixed operation label) is the only context kept, as a tag.
      const op = typeof context?.op === 'string' ? context.op : undefined;
      Sentry.captureException(error, op ? { tags: { op } } : undefined);
    },
    async flush() {
      await Sentry.flush(2000);
    },
    async shutdown() {
      await Sentry.close(2000);
    },
  };
}
