import { TelemetryManager } from '@qwery/telemetry/node';

let telemetryInstance: TelemetryManager | undefined;
let initializationFailed = false;

function createDisabledTelemetryManager(): TelemetryManager {
  const originalEnv = process.env.QWERY_TELEMETRY_ENABLED;
  try {
    process.env.QWERY_TELEMETRY_ENABLED = 'false';
    return new TelemetryManager('qwery-server-disabled');
  } finally {
    if (originalEnv !== undefined) {
      process.env.QWERY_TELEMETRY_ENABLED = originalEnv;
    } else {
      delete process.env.QWERY_TELEMETRY_ENABLED;
    }
  }
}

export async function getTelemetry(): Promise<TelemetryManager> {
  if (telemetryInstance) {
    return telemetryInstance;
  }

  if (initializationFailed) {
    return createDisabledTelemetryManager();
  }

  try {
    telemetryInstance = new TelemetryManager('qwery-server');
    await telemetryInstance.init();
  } catch (error) {
    console.error(
      '[Server] Failed to initialize telemetry:',
      error instanceof Error ? error.message : error,
    );
    initializationFailed = true;
    telemetryInstance = createDisabledTelemetryManager();
  }

  return telemetryInstance;
}
