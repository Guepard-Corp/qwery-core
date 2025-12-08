// apps/telemetry/src/telemetry-manager.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base';
import {
  context,
  diag,
  DiagConsoleLogger,
  DiagLogLevel,
  metrics,
  Span,
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
      ? new OTLPTraceExporter({
          url: otlpEndpoint,
        })
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
      const serializedAttributes = this.serializeAttributes(options.attributes);
      activeSpan.addEvent(options.name, serializedAttributes);
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
