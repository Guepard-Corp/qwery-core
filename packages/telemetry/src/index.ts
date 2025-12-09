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

// OpenTelemetry APIs are available via @qwery/telemetry/opentelemetry
// Not re-exported here to avoid bundling Node.js code in browser builds
