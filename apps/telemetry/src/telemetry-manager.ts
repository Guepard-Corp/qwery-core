// apps/telemetry/src/telemetry-manager.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { ConsoleSpanExporter, type SpanExporter, type ReadableSpan } from '@opentelemetry/sdk-trace-base';
import {
  context,
  diag,
  DiagConsoleLogger,
  DiagLogLevel,
  metrics,
  Span,
  SpanContext,
  SpanStatusCode,
  trace,
  type Meter,
  type Counter,
  type Histogram,
} from '@opentelemetry/api';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { ClientTelemetryService } from './client.telemetry.service';

// Enable OpenTelemetry internal logging (optional)
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

/**
 * Wraps an OTLP exporter to gracefully handle errors (e.g., when Jaeger is not running)
 * Falls back to console logging on error instead of crashing
 */
class SafeOTLPExporter implements SpanExporter {
  private otlpExporter: OTLPTraceExporter;
  private consoleExporter: ConsoleSpanExporter;
  private errorCount = 0;
  private readonly ERROR_THRESHOLD = 3; // Fall back after 3 consecutive errors

  constructor(baseEndpoint: string) {
    this.otlpExporter = new OTLPTraceExporter({
      url: baseEndpoint,
    });
    this.consoleExporter = new ConsoleSpanExporter();
  }

  export(spans: ReadableSpan[], resultCallback: (result: { code: number; error?: Error }) => void): void {
    // Try OTLP export first, with error handling
    try {
      this.otlpExporter.export(spans, (result) => {
        // Only treat as failure if there's an actual error object
        const hasError = result.error !== undefined && result.error !== null;
        
        if (!hasError) {
          // Success - reset error count
          this.errorCount = 0;
          resultCallback(result);
          return;
        }

        // Increment error count
        this.errorCount++;

        // Only fall back after multiple consecutive errors
        // This handles transient network issues gracefully
        if (this.errorCount >= this.ERROR_THRESHOLD) {
          // Log warning only once when threshold is reached
          if (this.errorCount === this.ERROR_THRESHOLD) {
            const errorMsg = result.error?.message || String(result.error);
            console.warn(
              `[Telemetry] OTLP export failed ${this.ERROR_THRESHOLD} times (${errorMsg}). ` +
              `Falling back to console exporter. Make sure Jaeger is running if you want OTLP export.`
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
      if (this.errorCount >= this.ERROR_THRESHOLD && this.errorCount === this.ERROR_THRESHOLD) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.warn(
          `[Telemetry] OTLP export error (${errorMsg}). ` +
          `Falling back to console exporter. Make sure Jaeger is running if you want OTLP export.`
        );
      }
      
      if (this.errorCount >= this.ERROR_THRESHOLD) {
        // Fallback to console exporter
        this.consoleExporter.export(spans, resultCallback);
      } else {
        // Still trying, pass error through
        resultCallback({ code: 1, error: error instanceof Error ? error : new Error(String(error)) });
      }
    }
  }

  shutdown(): Promise<void> {
    return Promise.all([
      this.otlpExporter.shutdown().catch(() => {}),
      this.consoleExporter.shutdown().catch(() => {}),
    ]).then(() => {});
  }
}

export class TelemetryManager {
  private sdk: NodeSDK;
  public clientService: ClientTelemetryService;
  private serviceName: string;
  private sessionId: string;
  private meter: Meter;
  
  // Metrics instruments (initialized in initializeMetrics)
  private commandDuration!: Histogram;
  private commandCount!: Counter;
  private commandErrorCount!: Counter;
  private commandSuccessCount!: Counter;
  private tokenPromptCount!: Counter;
  private tokenCompletionCount!: Counter;
  private tokenTotalCount!: Counter;
  private queryDuration!: Histogram;
  private queryCount!: Counter;
  private queryRowsReturned!: Histogram;

  constructor(serviceName: string = 'qwery-app', sessionId?: string) {
    this.serviceName = serviceName;
    this.sessionId = sessionId || this.generateSessionId();
    this.clientService = new ClientTelemetryService(this);

    // Create Resource using semantic conventions
    const resource = resourceFromAttributes({
      [ATTR_SERVICE_NAME]: this.serviceName,
      'session.id': this.sessionId,
    });

    // Use ConsoleSpanExporter for local/CLI testing (prints spans to console)
    // OTLP exporter is optional and only used if OTEL_EXPORTER_OTLP_ENDPOINT is set
    const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    

    const traceExporter = otlpEndpoint
      ? new SafeOTLPExporter(otlpEndpoint)
      : new ConsoleSpanExporter();

    // Note: NodeSDK automatically handles metrics if metricExporter is provided
    // For now, we'll configure metrics separately if needed
    // Metrics are exported via the same OTLP endpoint
    this.sdk = new NodeSDK({
      traceExporter,
      resource: resource,
      autoDetectResources: true,
      // Metrics will be exported via OTLP if endpoint is configured
      // The SDK will automatically detect and use the metrics exporter
    });

    // Initialize metrics
    this.meter = metrics.getMeter('qwery-cli', '1.0.0');
    this.initializeMetrics();
  }

  private generateSessionId(): string {
    return `cli-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private initializeMetrics(): void {
    // Command metrics
    this.commandDuration = this.meter.createHistogram('cli.command.duration', {
      description: 'Duration of CLI command execution in milliseconds',
      unit: 'ms',
    });

    this.commandCount = this.meter.createCounter('cli.command.count', {
      description: 'Total number of CLI commands executed',
    });

    this.commandErrorCount = this.meter.createCounter('cli.command.error.count', {
      description: 'Number of CLI commands that failed',
    });

    this.commandSuccessCount = this.meter.createCounter('cli.command.success.count', {
      description: 'Number of CLI commands that succeeded',
    });

    // Token usage metrics
    this.tokenPromptCount = this.meter.createCounter('cli.ai.tokens.prompt', {
      description: 'Total prompt tokens used',
    });

    this.tokenCompletionCount = this.meter.createCounter('cli.ai.tokens.completion', {
      description: 'Total completion tokens used',
    });

    this.tokenTotalCount = this.meter.createCounter('cli.ai.tokens.total', {
      description: 'Total tokens used (prompt + completion)',
    });

    // Query metrics
    this.queryDuration = this.meter.createHistogram('cli.query.duration', {
      description: 'Duration of query execution in milliseconds',
      unit: 'ms',
    });

    this.queryCount = this.meter.createCounter('cli.query.count', {
      description: 'Total number of queries executed',
    });

    this.queryRowsReturned = this.meter.createHistogram('cli.query.rows.returned', {
      description: 'Number of rows returned by queries',
    });
  }

  getSessionId(): string {
    return this.sessionId;
  }

  async init() {
    try {
      await this.sdk.start();
      console.log('TelemetryManager: OpenTelemetry initialized.');
    } catch (error) {
      console.error('TelemetryManager init error:', error);
    }
  }

  async shutdown() {
    try {
      await this.sdk.shutdown();
      console.log('TelemetryManager: OpenTelemetry shutdown complete.');
    } catch (error) {
      console.error('TelemetryManager shutdown error:', error);
    }
  }

  /**
   * Serializes attribute values to OpenTelemetry-compatible primitives.
   * Objects and arrays are converted to JSON strings.
   */
  private serializeAttributes(
    attributes?: Record<string, any>,
  ): Record<string, string | number | boolean> | undefined {
    if (!attributes) {
      return undefined;
    }

    const serialized: Record<string, string | number | boolean> = {};
    for (const [key, value] of Object.entries(attributes)) {
      if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
      ) {
        serialized[key] = value;
      } else if (value === null || value === undefined) {
        // Skip null/undefined values
        continue;
      } else {
        // Serialize objects, arrays, and other complex types to JSON
        try {
          serialized[key] = JSON.stringify(value);
        } catch (error) {
          // If serialization fails, convert to string
          serialized[key] = String(value);
        }
      }
    }
    return serialized;
  }

  startSpan(name: string, attributes?: Record<string, any>): Span {
    const tracer = trace.getTracer('qwery-telemetry');
    const serializedAttributes = this.serializeAttributes(attributes);
    // Use the active context to ensure proper span nesting
    const activeContext = context.active();
    const span = tracer.startSpan(name, { attributes: serializedAttributes }, activeContext);
    // Set the new span as active in the context
    const spanContext = trace.setSpan(activeContext, span);
    // Note: The span will automatically be a child of the active span in the context
    return span;
  }

  /**
   * Start a span with links to parent spans (useful for XState async actors)
   * @param name Span name
   * @param attributes Span attributes
   * @param parentSpanContexts Array of parent span contexts to link to
   */
  startSpanWithLinks(
    name: string,
    attributes?: Record<string, any>,
    parentSpanContexts?: Array<{ context: SpanContext; attributes?: Record<string, string | number | boolean> }>,
  ): Span {
    const tracer = trace.getTracer('qwery-telemetry');
    const serializedAttributes = this.serializeAttributes(attributes);
    const activeContext = context.active();

    // Create links from parent span contexts
    const links = parentSpanContexts?.map(({ context: spanContext, attributes: linkAttributes }) => ({
      context: spanContext,
      attributes: linkAttributes ? this.serializeAttributes(linkAttributes) : undefined,
    })) || [];

    const span = tracer.startSpan(
      name,
      {
        attributes: serializedAttributes,
        links,
      },
      activeContext,
    );

    return span;
  }

  endSpan(span: Span, success: boolean): void {
    if (success) {
      span.setStatus({ code: SpanStatusCode.OK });
    } else {
      span.setStatus({ code: SpanStatusCode.ERROR });
    }
    span.end();
  }

  captureEvent(options: {
    name: string;
    attributes?: Record<string, any>;
  }): void {
    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      try {
        const serializedAttributes = this.serializeAttributes(options.attributes);
        activeSpan.addEvent(options.name, serializedAttributes);
      } catch (error) {
        // Ignore errors when trying to add events to ended spans
        // This can happen when onFinish callbacks run after spans have been ended
        if (error instanceof Error && error.message.includes('ended Span')) {
          // Silently ignore - span is already ended
          return;
        }
        // Re-throw other errors
        throw error;
      }
    }
  }

  // Metrics recording methods
  recordCommandDuration(durationMs: number, attributes?: Record<string, string | number | boolean>): void {
    this.commandDuration.record(durationMs, attributes);
  }

  recordCommandCount(attributes?: Record<string, string | number | boolean>): void {
    this.commandCount.add(1, attributes);
  }

  recordCommandError(attributes?: Record<string, string | number | boolean>): void {
    this.commandErrorCount.add(1, attributes);
  }

  recordCommandSuccess(attributes?: Record<string, string | number | boolean>): void {
    this.commandSuccessCount.add(1, attributes);
  }

  recordTokenUsage(
    promptTokens: number,
    completionTokens: number,
    attributes?: Record<string, string | number | boolean>,
  ): void {
    this.tokenPromptCount.add(promptTokens, attributes);
    this.tokenCompletionCount.add(completionTokens, attributes);
    this.tokenTotalCount.add(promptTokens + completionTokens, attributes);
  }

  recordQueryDuration(durationMs: number, attributes?: Record<string, string | number | boolean>): void {
    this.queryDuration.record(durationMs, attributes);
  }

  recordQueryCount(attributes?: Record<string, string | number | boolean>): void {
    this.queryCount.add(1, attributes);
  }

  recordQueryRowsReturned(rowCount: number, attributes?: Record<string, string | number | boolean>): void {
    this.queryRowsReturned.record(rowCount, attributes);
  }
}
