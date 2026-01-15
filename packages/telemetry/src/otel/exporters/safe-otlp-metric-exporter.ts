// packages/telemetry/src/otel/exporters/safe-otlp-metric-exporter.ts
import { isDebugEnabled } from '../telemetry-utils';
import { loadNodeModules, isNode } from '../module-loader';

export class SafeOTLPMetricExporter {
  private otlpExporter: InstanceType<
    typeof import('@opentelemetry/exporter-metrics-otlp-grpc').OTLPMetricExporter
  > | null = null;
  private consoleExporter: InstanceType<
    typeof import('@opentelemetry/sdk-metrics').ConsoleMetricExporter
  > | null = null;
  private errorCount = 0;
  private readonly ERROR_THRESHOLD = 3; // Fall back after 3 consecutive errors
  private baseEndpoint: string;
  private initPromise: Promise<void> | null = null;
  private firstSuccess = false;
  private metricsErrorLogged = false;

  constructor(
    baseEndpoint: string,
    existingExporter?: InstanceType<
      typeof import('@opentelemetry/exporter-metrics-otlp-grpc').OTLPMetricExporter
    >,
  ) {
    this.baseEndpoint = baseEndpoint;
    if (isDebugEnabled()) {
      console.log(
        `[Telemetry] SafeOTLPMetricExporter created for endpoint: ${baseEndpoint}`,
      );
    }
    if (existingExporter) {
      this.otlpExporter = existingExporter;
      // Wrap the export method immediately
      this.wrapExportMethod();
    } else {
      // Lazy initialize exporters
      this.initPromise = this.initialize();
    }
  }

  private async initialize(): Promise<void> {
    if (!isNode) {
      return;
    }
    try {
      const modules = await loadNodeModules();
      // For gRPC, remove http:// or https:// prefix if present
      const grpcUrl = this.baseEndpoint.replace(/^https?:\/\//, '');
      const plainGrpcUrl = grpcUrl.replace(/^grpcs?:\/\//, '');
      this.otlpExporter = new modules.OTLPMetricExporter({
        url: plainGrpcUrl,
        credentials: modules.credentials.createInsecure(),
      });

      if (isDebugEnabled()) {
        console.log(
          `[Telemetry] OTLPMetricExporter initialized for: ${plainGrpcUrl}`,
        );
      }

      // Wrap the export method to catch errors
      this.wrapExportMethod();

      // Also create console exporter for fallback
      this.consoleExporter = new modules.ConsoleMetricExporter();
    } catch (error) {
      if (isDebugEnabled()) {
        console.warn(
          '[Telemetry] Failed to initialize OTLP metric exporter:',
          error,
        );
      }
    }
  }

  private wrapExportMethod(): void {
    if (!this.otlpExporter) return;

    const originalExport = this.otlpExporter.export.bind(this.otlpExporter);
    this.otlpExporter.export = async (metrics, resultCallback) => {
      if (isDebugEnabled()) {
        console.log(
          '[Telemetry] Export method called!',
          new Date().toISOString(),
        );
        // Temporary logging to debug export attempts
        const resourceMetrics = Array.isArray(metrics) ? metrics : [];
        const metricCount = resourceMetrics.reduce(
          (
            sum: number,
            rm: { scopeMetrics?: Array<{ metrics?: unknown[] }> },
          ) => {
            const scopeMetrics = rm.scopeMetrics || [];
            return (
              sum +
              scopeMetrics.reduce(
                (scopeSum: number, sm: { metrics?: unknown[] }) =>
                  scopeSum + (sm.metrics?.length || 0),
                0,
              )
            );
          },
          0,
        );
        if (isDebugEnabled()) {
          console.log('[Telemetry] Attempting to export metrics:', {
            metricCount,
            resourceCount: resourceMetrics.length,
            timestamp: new Date().toISOString(),
            endpoint: this.baseEndpoint,
          });
        }
      }

      try {
        await originalExport(metrics, (result) => {
          const hasError = result.error !== undefined && result.error !== null;

          if (isDebugEnabled()) {
            // Temporary logging: Always log export result
            console.log('[Telemetry] Metrics export result:', {
              success: !hasError,
              errorCode: result.code,
              error: result.error
                ? result.error instanceof Error
                  ? result.error.message
                  : String(result.error)
                : null,
              errorCount: this.errorCount,
              timestamp: new Date().toISOString(),
            });
          }

          if (!hasError) {
            // Success - reset error count
            this.errorCount = 0;
            if (!this.firstSuccess) {
              this.firstSuccess = true;
              if (isDebugEnabled()) {
                console.log(
                  '[Telemetry] OTLP Metrics export connection established successfully.',
                );
              }
            }
            if (resultCallback) {
              resultCallback(result);
            }
            return;
          }

          // Handle errors
          const errorMessage =
            result.error instanceof Error
              ? result.error.message
              : String(result.error);
          const isUnimplemented = errorMessage.includes('12 UNIMPLEMENTED');

          // Increment error count
          this.errorCount++;

          // Only log once per session to avoid spam
          if (!this.metricsErrorLogged && isDebugEnabled()) {
            if (isUnimplemented) {
              console.warn(
                `[Telemetry] Metrics export not supported by collector (${errorMessage}). ` +
                  `Metrics will be collected but not exported. Set QWERY_EXPORT_METRICS=false to disable metrics collection.`,
              );
            } else {
              console.warn(
                `[Telemetry] Metrics export failed (${errorMessage}). ` +
                  `Falling back to console exporter.`,
              );
            }
            this.metricsErrorLogged = true;
          }

          // Log export failures for debugging
          if (isDebugEnabled()) {
            console.warn(
              `[Telemetry] Metrics export failed (attempt ${this.errorCount}): ${errorMessage}`,
            );
          }

          if (this.consoleExporter) {
            this.consoleExporter.export(metrics, (_consoleResult) => {
              if (resultCallback) {
                resultCallback({ code: 0 });
              }
            });
          } else {
            if (resultCallback) {
              resultCallback({ code: 0 });
            }
          }
        });
      } catch (error) {
        // Handle synchronous errors
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const isUnimplemented = errorMessage.includes('12 UNIMPLEMENTED');

        if (!this.metricsErrorLogged && isDebugEnabled()) {
          if (isUnimplemented) {
            console.warn(
              `[Telemetry] Metrics export not supported by collector (${errorMessage}). ` +
                `Metrics will be collected but not exported.`,
            );
          } else {
            console.warn(
              `[Telemetry] Metrics export error (${errorMessage}). ` +
                `Falling back to console exporter.`,
            );
          }
          this.metricsErrorLogged = true;
        }

        // Fallback to console exporter
        if (this.consoleExporter) {
          this.consoleExporter.export(metrics, (_consoleResult) => {
            if (resultCallback) {
              resultCallback({ code: 0 });
            }
          });
        } else if (resultCallback) {
          resultCallback({ code: 0 });
        }
      }
    };
  }

  async export(
    metrics: Parameters<
      InstanceType<
        typeof import('@opentelemetry/exporter-metrics-otlp-grpc').OTLPMetricExporter
      >['export']
    >[0],
    resultCallback: Parameters<
      InstanceType<
        typeof import('@opentelemetry/exporter-metrics-otlp-grpc').OTLPMetricExporter
      >['export']
    >[1],
  ): Promise<void> {
    if (isDebugEnabled()) {
      console.log(
        '[Telemetry] SafeOTLPMetricExporter.export() called!',
        new Date().toISOString(),
      );
    }

    // Ensure exporters are initialized
    if (this.initPromise) {
      if (isDebugEnabled()) {
        console.log(
          '[Telemetry] Waiting for exporter initialization...',
          new Date().toISOString(),
        );
      }
      await this.initPromise;
      if (isDebugEnabled()) {
        console.log(
          '[Telemetry] Exporter initialization complete',
          new Date().toISOString(),
        );
      }
    }

    if (!this.otlpExporter) {
      if (isDebugEnabled()) {
        console.warn(
          '[Telemetry] OTLP exporter not initialized, falling back to console',
        );
      }
      // Fallback to console if OTLP not available
      if (this.consoleExporter) {
        this.consoleExporter.export(metrics, resultCallback);
      }
      return;
    }

    if (isDebugEnabled()) {
      console.log(
        '[Telemetry] Calling wrapped otlpExporter.export()...',
        new Date().toISOString(),
      );
    }

    await this.otlpExporter.export(metrics, resultCallback);
  }

  async shutdown(): Promise<void> {
    if (this.otlpExporter && 'shutdown' in this.otlpExporter) {
      await (this.otlpExporter as { shutdown: () => Promise<void> }).shutdown();
    }
    if (this.consoleExporter && 'shutdown' in this.consoleExporter) {
      await (
        this.consoleExporter as { shutdown: () => Promise<void> }
      ).shutdown();
    }
  }
}
