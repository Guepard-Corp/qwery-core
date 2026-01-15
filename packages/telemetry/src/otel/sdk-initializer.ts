// packages/telemetry/src/otel/sdk-initializer.ts
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base';
import { FilteringSpanExporter } from './filtering-exporter';
import { SafeOTLPExporter, SafeOTLPMetricExporter } from './exporters';
import { loadNodeModules } from './module-loader';
import { isDebugEnabled } from './telemetry-utils';
import type { OtelTelemetryManagerOptions } from './manager';

export interface SDKInitializationParams {
  serviceName: string;
  sessionId: string;
  options?: OtelTelemetryManagerOptions;
}

export async function initializeNodeSDK(
  params: SDKInitializationParams,
): Promise<InstanceType<
  typeof import('@opentelemetry/sdk-node').NodeSDK
> | null> {
  try {
    const modules = await loadNodeModules();

    // Create Resource using semantic conventions
    const resource = modules.resourceFromAttributes({
      [modules.ATTR_SERVICE_NAME]: params.serviceName,
      'session.id': params.sessionId,
    });

    const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

    const exportAppTelemetryEnv =
      process.env.QWERY_EXPORT_APP_TELEMETRY !== undefined
        ? process.env.QWERY_EXPORT_APP_TELEMETRY !== 'false'
        : undefined;
    const exportAppTelemetry =
      exportAppTelemetryEnv ?? params.options?.exportAppTelemetry ?? true;

    // Create base exporter
    const baseExporter = otlpEndpoint
      ? new SafeOTLPExporter(otlpEndpoint)
      : new ConsoleSpanExporter();

    // Wrap base exporter with span filtering (general vs app-specific spans)
    const traceExporter = new FilteringSpanExporter({
      exporter: baseExporter,
      exportAppTelemetry,
    });

    const exportMetricsEnv =
      process.env.QWERY_EXPORT_METRICS !== undefined
        ? process.env.QWERY_EXPORT_METRICS === 'true'
        : undefined;
    const exportMetrics =
      exportMetricsEnv ?? params.options?.exportMetrics ?? true;

    const isDebugMode = isDebugEnabled();
    const metricReader = isDebugMode
      ? (() => {
          if (isDebugEnabled()) {
            console.log(
              '[Telemetry] Debug mode enabled: Using ConsoleMetricExporter for metrics',
            );
          }
          return new modules.PeriodicExportingMetricReader({
            exporter: new modules.ConsoleMetricExporter(), // Console exporter for debugging
            exportIntervalMillis: 2000, // More frequent for debugging
          });
        })()
      : otlpEndpoint && exportMetrics
        ? (() => {
            if (isDebugEnabled()) {
              console.log(
                `[Telemetry] Using OTLP MetricExporter for metrics (endpoint: ${otlpEndpoint})`,
              );
            }
            // Create OTLP exporter directly
            const grpcUrl = otlpEndpoint.replace(/^https?:\/\//, '');
            const plainGrpcUrl = grpcUrl.replace(/^grpcs?:\/\//, '');
            const otlpMetricExporter = new modules.OTLPMetricExporter({
              url: plainGrpcUrl,
              credentials: modules.credentials.createInsecure(),
            });

            // Create SafeOTLPMetricExporter with the existing exporter
            // This will wrap the export method with error handling
            const safeMetricExporter = new SafeOTLPMetricExporter(
              otlpEndpoint,
              otlpMetricExporter,
            );

            if (isDebugEnabled()) {
              console.log(
                '[Telemetry] Creating PeriodicExportingMetricReader with SafeOTLPMetricExporter',
              );
              console.log(
                `[Telemetry] SafeOTLPMetricExporter has export method: ${typeof safeMetricExporter.export === 'function'}`,
              );
            }
            const reader = new modules.PeriodicExportingMetricReader({
              exporter: safeMetricExporter as unknown as InstanceType<
                typeof modules.OTLPMetricExporter
              >, // Pass SafeOTLPMetricExporter directly - it implements the interface
              exportIntervalMillis: 5000, // Export every 5 seconds
            });
            if (isDebugEnabled()) {
              console.log(
                '[Telemetry] PeriodicExportingMetricReader created, will export every 5 seconds',
              );
            }
            return reader;
          })()
        : (() => {
            if (isDebugEnabled()) {
              console.log(
                '[Telemetry] Metrics export disabled (no OTLP endpoint or exportMetrics=false)',
              );
            }
            return undefined;
          })();

    const sdk = new modules.NodeSDK({
      traceExporter,
      metricReaders: metricReader ? [metricReader] : undefined,
      resource,
      autoDetectResources: true,
    });

    // Log metric reader details
    if (metricReader && isDebugEnabled()) {
      console.log(
        `[Telemetry] NodeSDK created with metricReader: ${metricReader.constructor.name}`,
      );
      console.log(
        `[Telemetry] MetricReader type check: ${metricReader instanceof modules.PeriodicExportingMetricReader ? 'PeriodicExportingMetricReader' : 'Unknown'}`,
      );
    }

    // Log metrics pipeline status
    if (metricReader && isDebugEnabled()) {
      console.log(
        '[Telemetry] Metrics pipeline initialized successfully. Metrics will be exported every 5 seconds.',
      );
      console.log(
        '[Telemetry] Debug mode: All metric recordings will be logged.',
      );
    }

    return sdk;
  } catch (error) {
    if (isDebugEnabled()) {
      console.warn('[Telemetry] Failed to initialize Node.js SDK:', error);
    }
    return null;
  }
}
