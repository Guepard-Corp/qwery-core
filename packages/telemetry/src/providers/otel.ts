/**
 * OpenTelemetry Telemetry Provider
 * 
 * Wraps OpenTelemetry TelemetryManager to work with the unified TelemetryManager interface.
 * This allows OTel to be used alongside PostHog and Sentry.
 */

import { OtelTelemetryManager } from '../otel/manager';
import type { OtelTelemetryManagerOptions } from '../otel/manager';
import type { TelemetryService } from '../types';

/**
 * OpenTelemetry provider configuration
 */
export interface OtelProviderConfig {
  serviceName?: string;
  sessionId?: string;
  options?: OtelTelemetryManagerOptions;
}

/**
 * Creates an OpenTelemetry telemetry provider
 * 
 * Note: OpenTelemetry is primarily for observability (spans, metrics, traces).
 * For product analytics, use PostHog provider.
 */
export function createOtelProvider(
  config?: OtelProviderConfig,
): () => TelemetryService {
  return () => {
    const manager = new OtelTelemetryManager(
      config?.serviceName,
      config?.sessionId,
      config?.options,
    );
    
    // Initialize the SDK
    void manager.init();
    
    // Return a wrapper that implements TelemetryService
    // This allows OTel to work with the unified TelemetryManager
    return {
      async initialize() {
        await manager.init();
      },
      async ready() {
        return Promise.resolve();
      },
      async trackPageView(path: string) {
        manager.captureEvent({
          name: 'page.view',
          attributes: { path },
        });
      },
      async trackEvent(
        eventName: string,
        properties?: Record<string, string | string[]>,
      ) {
        manager.captureEvent({
          name: eventName,
          attributes: properties as Record<string, unknown>,
        });
      },
      async identify(userId: string, traits?: Record<string, string>) {
        manager.captureEvent({
          name: 'user.identify',
          attributes: {
            userId,
            ...traits,
          },
        });
      },
      async trackError(error: Error) {
        manager.captureEvent({
          name: 'error.occurred',
          attributes: {
            'error.name': error.name,
            'error.message': error.message,
            'error.stack': error.stack || '',
          },
        });
      },
      async trackUsage(usage: string) {
        manager.captureEvent({
          name: 'usage.tracked',
          attributes: { usage },
        });
      },
      async trackPerformance(performance: string) {
        manager.captureEvent({
          name: 'performance.tracked',
          attributes: { performance },
        });
      },
      async trackFeatureUsage(feature: string) {
        manager.captureEvent({
          name: 'feature.used',
          attributes: { feature },
        });
      },
      async trackAgent(agent: string) {
        manager.captureEvent({
          name: 'agent.tracked',
          attributes: { agent },
        });
      },
    };
  };
}

