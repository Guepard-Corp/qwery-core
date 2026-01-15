export interface TelemetryConfig {
  /** Global kill switch - if false, telemetry is completely disabled */
  enabled: boolean;
  /** OTLP endpoint for traces and metrics export */
  otlpEndpoint: string | undefined;
  /** Whether to export app-specific telemetry (spans) */
  exportAppTelemetry: boolean;
  /** Whether to export metrics */
  exportMetrics: boolean;
  /** Debug mode - enables verbose logging and console exporters */
  debug: boolean;
}

export function getTelemetryConfig(options?: {
  exportAppTelemetry?: boolean;
  exportMetrics?: boolean;
}): TelemetryConfig {
  const enabled =
    process.env.QWERY_TELEMETRY_ENABLED === undefined ||
    process.env.QWERY_TELEMETRY_ENABLED !== 'false';

  if (!enabled) {
    return {
      enabled: false,
      otlpEndpoint: undefined,
      exportAppTelemetry: false,
      exportMetrics: false,
      debug: false,
    };
  }

  const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

  const exportAppTelemetryEnv =
    process.env.QWERY_EXPORT_APP_TELEMETRY !== undefined
      ? process.env.QWERY_EXPORT_APP_TELEMETRY !== 'false'
      : undefined;
  const exportAppTelemetry =
    exportAppTelemetryEnv ?? options?.exportAppTelemetry ?? true;

  const exportMetricsEnv =
    process.env.QWERY_EXPORT_METRICS !== undefined
      ? process.env.QWERY_EXPORT_METRICS === 'true'
      : undefined;
  const exportMetrics = exportMetricsEnv ?? options?.exportMetrics ?? false;

  const debug = process.env.QWERY_TELEMETRY_DEBUG === 'true';

  return {
    enabled: true,
    otlpEndpoint,
    exportAppTelemetry,
    exportMetrics,
    debug,
  };
}

export function isTelemetryEnabled(): boolean {
  return (
    process.env.QWERY_TELEMETRY_ENABLED === undefined ||
    process.env.QWERY_TELEMETRY_ENABLED !== 'false'
  );
}
