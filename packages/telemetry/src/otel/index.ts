// Main exports for @qwery/telemetry/otel

// Core services
export {
  OtelTelemetryManager,
  TelemetryManager,
  type OtelTelemetryManagerOptions,
  type TelemetryManagerOptions,
} from './manager';
export { OtelClientService } from './client-service';
// Export alias for backward compatibility
export { OtelClientService as ClientTelemetryService } from './client-service';
export {
  FilteringSpanExporter,
  type FilteringSpanExporterOptions,
} from './filtering-exporter';
export {
  OtelNullTelemetryService,
  NullTelemetryService,
  createOtelNullTelemetryService,
  createNullTelemetryService,
} from './null-service';

// Telemetry utilities (generic, works for CLI, web, desktop)
export {
  withActionSpan,
  createActionAttributes,
  parseActionName,
  recordQueryMetrics,
  recordTokenUsage,
  type ActionContext,
  type WorkspaceContext,
} from './utils';

// React context for web/desktop apps
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

// Agent telemetry helpers
export {
  createConversationAttributes,
  createMessageAttributes,
  createActorAttributes,
  endMessageSpanWithEvent,
  endConversationSpanWithEvent,
  endActorSpanWithEvent,
  withActorTelemetry,
} from './agent-helpers';

