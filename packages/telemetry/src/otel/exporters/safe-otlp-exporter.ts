// packages/telemetry/src/otel/exporters/safe-otlp-exporter.ts
import {
  ConsoleSpanExporter,
  type SpanExporter,
  type ReadableSpan,
} from '@opentelemetry/sdk-trace-base';
import { isDebugEnabled } from '../telemetry-utils';
import { loadNodeModules, isNode } from '../module-loader';

export class SafeOTLPExporter implements SpanExporter {
  private otlpExporter: InstanceType<
    typeof import('@opentelemetry/exporter-trace-otlp-grpc').OTLPTraceExporter
  > | null = null;
  private consoleExporter: ConsoleSpanExporter;
  private errorCount = 0;
  private readonly ERROR_THRESHOLD = 3; // Fall back after 3 consecutive errors
  private baseEndpoint: string;
  private initPromise: Promise<void> | null = null;

  constructor(baseEndpoint: string) {
    this.baseEndpoint = baseEndpoint;
    this.consoleExporter = new ConsoleSpanExporter();
    // Lazy initialize OTLP exporter
    this.initPromise = this.initialize();
  }

  private async initialize(): Promise<void> {
    if (!isNode) {
      return;
    }
    try {
      const modules = await loadNodeModules();

      const grpcUrl = this.baseEndpoint.replace(/^https?:\/\//, '');
      const plainGrpcUrl = grpcUrl.replace(/^grpcs?:\/\//, '');
      this.otlpExporter = new modules.OTLPTraceExporter({
        url: plainGrpcUrl,
        credentials: modules.credentials.createInsecure(), // Use insecure credentials for plain gRPC (non-TLS)
      });
    } catch (error) {
      if (isDebugEnabled()) {
        console.warn('[Telemetry] Failed to initialize OTLP exporter:', error);
      }
    }
  }

  private firstSuccess = false;

  export(
    spans: ReadableSpan[],
    resultCallback: (result: { code: number; error?: Error }) => void,
  ): void {
    // Ensure OTLP exporter is initialized
    if (this.initPromise) {
      this.initPromise
        .then(() => {
          this.exportInternal(spans, resultCallback);
        })
        .catch(() => {
          // If initialization failed, use console exporter
          this.consoleExporter.export(spans, resultCallback);
        });
      return;
    }
    this.exportInternal(spans, resultCallback);
  }

  private exportInternal(
    spans: ReadableSpan[],
    resultCallback: (result: { code: number; error?: Error }) => void,
  ): void {
    if (!this.otlpExporter) {
      this.consoleExporter.export(spans, resultCallback);
      return;
    }

    try {
      this.otlpExporter.export(spans, (result) => {
        const hasError = result.error !== undefined && result.error !== null;

        if (!hasError) {
          // Success - reset error count
          this.errorCount = 0;
          if (!this.firstSuccess) {
            this.firstSuccess = true;
            if (isDebugEnabled()) {
              console.log(
                '[Telemetry] OTLP Trace export connection established successfully.',
              );
            }
          }
          resultCallback(result);
          return;
        }

        // Increment error count
        this.errorCount++;

        // Only fall back after multiple consecutive errors
        // This handles transient network issues gracefully
        if (this.errorCount >= this.ERROR_THRESHOLD) {
          // Log warning only once when threshold is reached
          if (this.errorCount === this.ERROR_THRESHOLD && isDebugEnabled()) {
            const errorMsg = result.error?.message || String(result.error);
            console.warn(
              `[Telemetry] OTLP export failed ${this.ERROR_THRESHOLD} times (${errorMsg}). ` +
                `Falling back to console exporter. Make sure Jaeger is running if you want OTLP export.`,
            );
          }
          // Fallback to console exporter after threshold
          this.consoleExporter.export(spans, resultCallback);
        } else {
          // Still trying OTLP, but pass through the error result
          // This allows the SDK to handle retries
          resultCallback(result);
        }
      });
    } catch (error) {
      // Catch any synchronous errors from the export call
      this.errorCount++;
      if (
        this.errorCount >= this.ERROR_THRESHOLD &&
        this.errorCount === this.ERROR_THRESHOLD &&
        isDebugEnabled()
      ) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.warn(
          `[Telemetry] OTLP export error (${errorMsg}). ` +
            `Falling back to console exporter. Make sure Jaeger is running if you want OTLP export.`,
        );
      }

      if (this.errorCount >= this.ERROR_THRESHOLD) {
        // Fallback to console exporter
        this.consoleExporter.export(spans, resultCallback);
      } else {
        // Still trying, pass error through
        resultCallback({
          code: 1,
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }
    }
  }

  shutdown(): Promise<void> {
    return Promise.all([
      this.otlpExporter?.shutdown().catch(() => {}) || Promise.resolve(),
      this.consoleExporter.shutdown().catch(() => {}),
    ]).then(() => {});
  }
}
