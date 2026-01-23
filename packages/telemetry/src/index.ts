import { createTelemetryManager } from './telemetry-manager';
import type { TelemetryManager } from './types';
import { ClientTelemetryService } from './client.telemetry.service';

export const telemetry: TelemetryManager = createTelemetryManager({
  providers: {
    telemetry: () => new ClientTelemetryService(),
  },
});

export * from './components';
export { useTelemetry } from './hooks/use-telemetry';
export { useCaptureException } from './hooks/use-capture-exception';
export { NOTEBOOK_EVENTS, PROJECT_EVENTS } from './events';

export {
  OtelClientService,
  ClientTelemetryService as OtelClientTelemetryService,
  FilteringSpanExporter,
  type FilteringSpanExporterOptions,
  OtelNullTelemetryService,
  createOtelNullTelemetryService,
  withActionSpan,
  createActionAttributes,
  parseActionName,
  recordQueryMetrics,
  recordTokenUsage,
  type ActionContext,
  type WorkspaceContext,
  OtelTelemetryProvider,
  useOtelTelemetry,
  withOtelTelemetryContext,
  type OtelTelemetryContextValue,
  type OtelTelemetryProviderProps,
  createConversationAttributes,
  createMessageAttributes,
  createActorAttributes,
  endMessageSpanWithEvent,
  endConversationSpanWithEvent,
  endActorSpanWithEvent,
  withActorTelemetry,
} from './otel';

export { createPostHogProvider } from './providers/posthog';
export {
  createSentryProvider,
  type SentryProviderConfig,
} from './providers/sentry';
