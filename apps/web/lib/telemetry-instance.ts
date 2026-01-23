import { TelemetryManager } from '@qwery/telemetry/node';

let telemetryInstance: TelemetryManager | undefined;
let initializationFailed = false;

function createDisabledTelemetryManager(): TelemetryManager {
  const originalEnv = process.env.QWERY_TELEMETRY_ENABLED;
  try {
    process.env.QWERY_TELEMETRY_ENABLED = 'false';
    return new TelemetryManager('qwery-web-server-disabled');
  } finally {
    if (originalEnv !== undefined) {
      process.env.QWERY_TELEMETRY_ENABLED = originalEnv;
    } else {
      delete process.env.QWERY_TELEMETRY_ENABLED;
    }
  }
}

export async function getWebTelemetry(): Promise<TelemetryManager> {
  if (telemetryInstance) {
    return telemetryInstance;
  }

  if (initializationFailed) {
    return createDisabledTelemetryManager();
  }

  console.log('[WebTelemetry] Initializing server-side telemetry...');

  try {
    telemetryInstance = new TelemetryManager('qwery-web-server');
    await telemetryInstance.init();
    console.log(
      '[WebTelemetry] Server-side telemetry initialized successfully.',
    );

    const span = telemetryInstance.startSpan('web.server.heartbeat', {
      timestamp: new Date().toISOString(),
    });
    telemetryInstance.endSpan(span, true);
  } catch (error) {
    console.error(
      '[WebTelemetry] Failed to initialize server-side telemetry:',
      error,
    );
    initializationFailed = true;
    telemetryInstance = createDisabledTelemetryManager();
    console.log('[WebTelemetry] Using disabled telemetry manager as fallback.');
  }

  return telemetryInstance;
}
