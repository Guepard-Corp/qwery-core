// packages/telemetry/src/otel/module-loader.ts
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';

let nodeSdkModule: typeof import('@opentelemetry/sdk-node') | null = null;
let otlpTraceExporterModule:
  | typeof import('@opentelemetry/exporter-trace-otlp-grpc')
  | null = null;
let otlpMetricExporterModule:
  | typeof import('@opentelemetry/exporter-metrics-otlp-grpc')
  | null = null;
let sdkMetricsModule: typeof import('@opentelemetry/sdk-metrics') | null = null;
let grpcModule: typeof import('@grpc/grpc-js') | null = null;
let resourcesModule: typeof import('@opentelemetry/resources') | null = null;
let semanticConventionsModule:
  | typeof import('@opentelemetry/semantic-conventions')
  | null = null;

export const isNode = typeof process !== 'undefined' && process.versions?.node;

export async function loadNodeModules() {
  if (!isNode) {
    throw new Error(
      'OpenTelemetry Node.js modules are only available in Node.js environment',
    );
  }

  if (!nodeSdkModule) {
    nodeSdkModule = await import('@opentelemetry/sdk-node');
  }
  if (!otlpTraceExporterModule) {
    otlpTraceExporterModule = await import(
      '@opentelemetry/exporter-trace-otlp-grpc'
    );
  }
  if (!otlpMetricExporterModule) {
    otlpMetricExporterModule = await import(
      '@opentelemetry/exporter-metrics-otlp-grpc'
    );
  }
  if (!sdkMetricsModule) {
    sdkMetricsModule = await import('@opentelemetry/sdk-metrics');
  }
  if (!grpcModule) {
    grpcModule = await import('@grpc/grpc-js');
  }
  if (!resourcesModule) {
    resourcesModule = await import('@opentelemetry/resources');
  }
  if (!semanticConventionsModule) {
    semanticConventionsModule = await import(
      '@opentelemetry/semantic-conventions'
    );
  }

  return {
    NodeSDK: nodeSdkModule.NodeSDK,
    OTLPTraceExporter: otlpTraceExporterModule.OTLPTraceExporter,
    OTLPMetricExporter: otlpMetricExporterModule.OTLPMetricExporter,
    PeriodicExportingMetricReader:
      sdkMetricsModule.PeriodicExportingMetricReader,
    ConsoleMetricExporter: sdkMetricsModule.ConsoleMetricExporter,
    credentials: grpcModule.credentials,
    resourceFromAttributes: resourcesModule.resourceFromAttributes,
    ATTR_SERVICE_NAME: semanticConventionsModule.ATTR_SERVICE_NAME,
  };
}

// Initialize OpenTelemetry diagnostics logger in Node.js environment
if (isNode) {
  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);
}
