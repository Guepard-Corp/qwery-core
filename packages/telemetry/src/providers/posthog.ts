import { PostHog } from 'posthog-node';
import { cleanAttributes, type TelemetryBackend } from '../backend';
import type { PostHogConfig } from '../config';

/**
 * PostHog backend — product analytics for the CLI/TUI.
 *
 * Uses `posthog-node` (server-side) rather than `posthog-js`: the TUI has no
 * DOM. Events are buffered and flushed on `flush`/`shutdown`. The distinct id
 * starts anonymous and is updated by `identify`.
 */
export function createPostHogBackend(config: PostHogConfig, anonymousId: string): TelemetryBackend {
  const posthog = new PostHog(config.apiKey, {
    host: config.host,
    // Flush eagerly-ish; the CLI is short-lived so we also flush on shutdown.
    flushAt: 20,
    flushInterval: 10_000,
    // posthog-node defaults disableGeoip to true (it sends `$geoip_disable`),
    // which suppresses PostHog's location enrichment. Opt in so events get
    // country/region/city derived from the request IP server-side.
    disableGeoip: false,
  });

  let distinctId = anonymousId;

  return {
    name: 'posthog',
    trackEvent(name, properties) {
      posthog.capture({ distinctId, event: name, properties: cleanAttributes(properties) });
    },
    identify(id, traits) {
      distinctId = id;
      posthog.identify({ distinctId: id, properties: cleanAttributes(traits) });
    },
    trackError(error, context) {
      // error.name only (generic class name) + safe context — never the message.
      posthog.capture({
        distinctId,
        event: 'app.error',
        properties: { ...cleanAttributes(context), error_name: error.name },
      });
    },
    recordTokenUsage(usage) {
      posthog.capture({
        distinctId,
        event: 'agent.llm.tokens.used',
        properties: {
          model: usage.model,
          provider: usage.provider,
          prompt_tokens: usage.promptTokens,
          completion_tokens: usage.completionTokens,
          total_tokens: usage.totalTokens ?? usage.promptTokens + usage.completionTokens,
        },
      });
    },
    async flush() {
      await posthog.flush();
    },
    async shutdown() {
      await posthog.shutdown();
    },
  };
}
