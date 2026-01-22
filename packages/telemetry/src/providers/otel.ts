import { TelemetryManager as OtelTelemetryManager } from '../otel/node';
import type { OtelTelemetryManagerOptions } from '../otel/types';
import type { TelemetryService } from '../types';

/**
 * OpenTelemetry provider configuration
 */
export interface OtelProviderConfig {
  serviceName?: string;
  sessionId?: string;
  options?: OtelTelemetryManagerOptions;
}

export function createOtelProvider(
  config?: OtelProviderConfig,
): () => TelemetryService {
  return () => {
    const manager = new OtelTelemetryManager(
      config?.serviceName,
      config?.sessionId,
      config?.options,
    );

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
