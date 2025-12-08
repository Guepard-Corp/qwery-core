// Main exports for @qwery/telemetry-opentelemetry

// Core services
export { TelemetryManager } from './telemetry-manager';
export { ClientTelemetryService } from './client.telemetry.service';
export { NullTelemetryService, createNullTelemetryService } from './null-telemetry-service';

// Telemetry utilities (generic, works for CLI, web, desktop)
export {
  withActionSpan,
  createActionAttributes,
  parseActionName,
  recordQueryMetrics,
  recordTokenUsage,
  type ActionContext,
  type WorkspaceContext,
} from './telemetry-utils';

// React context for web/desktop apps
export {
  TelemetryProvider,
  useTelemetry,
  withTelemetryContext,
  type TelemetryContextValue,
  type TelemetryProviderProps,
} from './telemetry.context';

// Event schemas and constants
export {
  CLI_EVENTS,
  type CliEventName,
  type CliEventAttributes,
  type CliCommandAttributes,
  type CliWorkspaceAttributes,
  type CliErrorAttributes,
  type CliQueryAttributes,
} from './events/cli.events';

export {
  WEB_EVENTS,
  type WebEventName,
  type WebEventAttributes,
  type WebPageAttributes,
  type WebUIAttributes,
  type WebAPIAttributes,
} from './events/web.events';

export {
  DESKTOP_EVENTS,
  type DesktopEventName,
  type DesktopEventAttributes,
  type DesktopWindowAttributes,
  type DesktopMenuAttributes,
  type DesktopCommandAttributes,
} from './events/desktop.events';

export {
  AGENT_EVENTS,
  type AgentEventName,
  type AgentEventAttributes,
  type AgentConversationAttributes,
  type AgentMessageAttributes,
  type AgentActorAttributes,
  type AgentLLMAttributes,
  type AgentContextAttributes,
  type AgentErrorAttributes,
} from './events/agent.events';

