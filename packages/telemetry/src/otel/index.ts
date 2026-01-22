// Browser-safe OpenTelemetry exports
// For Node.js-only TelemetryManager with full SDK, use '@qwery/telemetry/node'

// Re-export TelemetryManager type for backward compatibility (type-only, no runtime code)
export type {
  TelemetryManager,
  TelemetryManagerOptions,
  OtelTelemetryManagerOptions,
} from './types';

export { OtelClientService } from './client-service';
export { OtelClientService as ClientTelemetryService } from './client-service';
export {
  FilteringSpanExporter,
  type FilteringSpanExporterOptions,
} from './filtering-exporter';
export {
  OtelNullTelemetryService,
  createOtelNullTelemetryService,
} from './null-service';

export {
  withActionSpan,
  createActionAttributes,
  parseActionName,
  recordQueryMetrics,
  recordTokenUsage,
  type ActionContext,
  type WorkspaceContext,
} from './utils';

export {
  OtelTelemetryProvider,
  TelemetryProvider,
  useOtelTelemetry,
  useTelemetry,
  withOtelTelemetryContext,
  withTelemetryContext,
  type OtelTelemetryContextValue,
  type TelemetryContextValue,
  type OtelTelemetryProviderProps,
  type TelemetryProviderProps,
} from './context';

export {
  createConversationAttributes,
  createMessageAttributes,
  createActorAttributes,
  endMessageSpanWithEvent,
  endConversationSpanWithEvent,
  endActorSpanWithEvent,
  withActorTelemetry,
} from './agent-helpers';
