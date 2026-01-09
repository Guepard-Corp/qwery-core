// apps/web/lib/telemetry-instance.ts
import { TelemetryManager } from '@qwery/telemetry/otel';

/**
 * Server-side telemetry instance for the web application.
 * Ensures the OpenTelemetry SDK is initialized only once in the Node.js environment.
 */
let telemetryInstance: TelemetryManager | undefined;

export async function getWebTelemetry(): Promise<TelemetryManager> {
  if (telemetryInstance) {
    return telemetryInstance;
  }

  console.log('[WebTelemetry] Initializing server-side telemetry...');

  // Use a unique name for the web server to distinguish it from the CLI
  telemetryInstance = new TelemetryManager('qwery-web-server');

  try {
    await telemetryInstance.init();
    console.log(
      '[WebTelemetry] Server-side telemetry initialized successfully.',
    );

    // Send a heartbeat span to verify export works immediately
    const span = telemetryInstance.startSpan('web.server.heartbeat', {
      timestamp: new Date().toISOString(),
    });
    telemetryInstance.endSpan(span, true);
  } catch (error) {
    console.error(
      '[WebTelemetry] Failed to initialize server-side telemetry:',
      error,
    );
  }

  return telemetryInstance;
}
