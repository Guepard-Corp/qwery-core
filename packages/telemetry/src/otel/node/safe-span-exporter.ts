import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base'; // runtime value
import type { SpanExporter, ReadableSpan } from '@opentelemetry/sdk-trace-base';
import type { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { isDebugEnabled } from '../telemetry-utils';

export class SafeOTLPSpanExporter implements SpanExporter {
  private otlpExporter: OTLPTraceExporter;
  private consoleExporter: ConsoleSpanExporter;
  private errorCount = 0;
  private readonly ERROR_THRESHOLD = 3;
  private firstSuccess = false;
  private baseEndpoint: string;

  constructor(baseEndpoint: string, otlpExporter: OTLPTraceExporter) {
    this.baseEndpoint = baseEndpoint;
    this.otlpExporter = otlpExporter;
    this.consoleExporter = new ConsoleSpanExporter(); // fallback
  }

  export(
    spans: ReadableSpan[],
    resultCallback: (result: { code: number; error?: Error }) => void,
  ): void {
    try {
      this.otlpExporter.export(spans, (result) => {
        const hasError = result.error !== undefined && result.error !== null;

        if (!hasError) {
          this.errorCount = 0;

          if (!this.firstSuccess) {
            this.firstSuccess = true;
            if (isDebugEnabled()) {
              console.log(
                `[Telemetry] OTLP Trace export connection established (endpoint: ${this.baseEndpoint})`,
              );
            }
          }

          resultCallback(result);
          return;
        }

        this.errorCount++;

        if (this.errorCount >= this.ERROR_THRESHOLD) {
          if (this.errorCount === this.ERROR_THRESHOLD && isDebugEnabled()) {
            const errorMsg = result.error?.message || String(result.error);
            console.warn(
              `[Telemetry] OTLP trace export failed ${this.ERROR_THRESHOLD} times (${errorMsg}). ` +
                `Falling back to console exporter.`,
            );
          }
          this.consoleExporter.export(spans, resultCallback);
        } else {
          resultCallback(result);
        }
      });
    } catch (error) {
      this.errorCount++;
      if (
        this.errorCount >= this.ERROR_THRESHOLD &&
        this.errorCount === this.ERROR_THRESHOLD &&
        isDebugEnabled()
      ) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.warn(
          `[Telemetry] OTLP trace export error (${errorMsg}). Falling back to console exporter.`,
        );
      }

      if (this.errorCount >= this.ERROR_THRESHOLD) {
        this.consoleExporter.export(spans, resultCallback);
      } else {
        resultCallback({
          code: 1,
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }
    }
  }

  async forceFlush(): Promise<void> {
    return this.otlpExporter.forceFlush?.() ?? Promise.resolve();
  }

  async shutdown(): Promise<void> {
    return Promise.all([
      this.otlpExporter.shutdown?.().catch(() => {}) ?? Promise.resolve(),
      this.consoleExporter.shutdown?.().catch(() => {}) ?? Promise.resolve(),
    ]).then(() => {});
  }
}
