import type { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc';
import type {
  PushMetricExporter,
  ResourceMetrics,
  InstrumentType,
  AggregationTemporality,
  AggregationOption,
} from '@opentelemetry/sdk-metrics';
import { isDebugEnabled } from '../telemetry-utils';

export class SafeOTLPMetricExporter implements PushMetricExporter {
  private otlpExporter: OTLPMetricExporter;
  private errorCount = 0;
  private readonly ERROR_THRESHOLD = 3;
  private baseEndpoint: string;
  private firstSuccess = false;

  constructor(baseEndpoint: string, otlpExporter: OTLPMetricExporter) {
    this.baseEndpoint = baseEndpoint;
    this.otlpExporter = otlpExporter;
  }

  export(
    metrics: ResourceMetrics,
    resultCallback: (result: { code: number; error?: Error }) => void,
  ): void {
    try {
      this.otlpExporter.export(metrics, (result) => {
        const hasError = result.error !== undefined && result.error !== null;

        if (!hasError) {
          this.errorCount = 0;
          if (!this.firstSuccess) {
            this.firstSuccess = true;
            if (isDebugEnabled()) {
              console.log(
                `[Telemetry] OTLP Metric export connection established (endpoint: ${this.baseEndpoint})`,
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
              `[Telemetry] OTLP metric export failed ${this.ERROR_THRESHOLD} times (${errorMsg}). Metrics will be dropped.`,
            );
          }
          resultCallback({ code: 0 });
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
          `[Telemetry] OTLP metric export error (${errorMsg}). Metrics will be dropped.`,
        );
      }

      if (this.errorCount >= this.ERROR_THRESHOLD) {
        resultCallback({ code: 0 });
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
    return this.otlpExporter.shutdown?.() ?? Promise.resolve();
  }

  selectAggregationTemporality(
    instrumentType: InstrumentType,
  ): AggregationTemporality {
    return this.otlpExporter.selectAggregationTemporality(instrumentType);
  }

  selectAggregation(instrumentType: InstrumentType): AggregationOption {
    return this.otlpExporter.selectAggregation(instrumentType);
  }
}
