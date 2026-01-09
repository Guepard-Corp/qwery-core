import { createTelemetryManager } from './telemetry-manager';
import type { TelemetryManager } from './types';
import { ClientTelemetryService } from './client.telemetry.service';

export const telemetry: TelemetryManager = createTelemetryManager({
  providers: {
    telemetry: () => new ClientTelemetryService(),
  },
});

export { TelemetryProvider } from './components/telemetry-provider';
export { useTelemetry } from './hooks/use-telemetry';
export { NOTEBOOK_EVENTS, PROJECT_EVENTS } from './events';

// OpenTelemetry APIs are available via @qwery/telemetry/otel
// Re-exported for convenience, but Node.js-only code uses dynamic imports
export * from './otel';

// Telemetry providers for unified manager
export * from './providers';
