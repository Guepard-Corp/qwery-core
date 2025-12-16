// packages/telemetry/src/opentelemetry/telemetry-manager.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { credentials } from '@grpc/grpc-js';
import {
  ConsoleSpanExporter,
  type SpanExporter,
  type ReadableSpan,
} from '@opentelemetry/sdk-trace-base';
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
import {
  FilteringSpanExporter,
  type FilteringSpanExporterOptions,
} from './filtering-span-exporter';

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
    // For gRPC, remove http:// or https:// prefix if present
    // gRPC expects format: host:port (e.g., "10.103.227.71:4317")
    // Use plain text (non-TLS) connection
    const grpcUrl = baseEndpoint.replace(/^https?:\/\//, '');
    // Ensure we're using plain gRPC (not grpcs:// which would use TLS)
    const plainGrpcUrl = grpcUrl.replace(/^grpcs?:\/\//, '');
    this.otlpExporter = new OTLPTraceExporter({
      url: plainGrpcUrl,
      credentials: credentials.createInsecure(), // Use insecure credentials for plain gRPC (non-TLS)
    });
    this.consoleExporter = new ConsoleSpanExporter();
  }

  export(
    spans: ReadableSpan[],
    resultCallback: (result: { code: number; error?: Error }) => void,
  ): void {
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
        this.errorCount === this.ERROR_THRESHOLD
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
      this.otlpExporter.shutdown().catch(() => {}),
      this.consoleExporter.shutdown().catch(() => {}),
    ]).then(() => {});
  }
}

/**
 * Configuration options for TelemetryManager
 */
export interface TelemetryManagerOptions {
  /**
   * Whether to export app-specific telemetry (cli, web, desktop spans)
   * General spans (agents, actors, LLM) are always exported regardless of this setting.
   * Default: true (for backward compatibility)
   * Can be overridden by QWERY_EXPORT_APP_TELEMETRY environment variable
   */
  exportAppTelemetry?: boolean;
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
  // Agent metrics (for dashboard)
  private messageDuration!: Histogram;
  private tokensPrompt!: Counter;
  private tokensCompletion!: Counter;
  private tokensTotal!: Counter;

  constructor(
    serviceName: string = 'qwery-app',
    sessionId?: string,
    options?: TelemetryManagerOptions,
  ) {
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
    //const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    const otlpEndpoint = 'http://10.103.227.71:4317';

    // Resolve exportAppTelemetry setting:
    // 1. Check environment variable (QWERY_EXPORT_APP_TELEMETRY)
    // 2. Check options parameter
    // 3. Default to true (backward compatibility)
    const exportAppTelemetryEnv =
      process.env.QWERY_EXPORT_APP_TELEMETRY !== undefined
        ? process.env.QWERY_EXPORT_APP_TELEMETRY !== 'false'
        : undefined;
    const exportAppTelemetry =
      exportAppTelemetryEnv ?? options?.exportAppTelemetry ?? true;

    // Create base exporter
    const baseExporter = otlpEndpoint
      ? new SafeOTLPExporter(otlpEndpoint)
      : new ConsoleSpanExporter();

    // Wrap base exporter with span filtering (general vs app-specific spans)
    const traceExporter = new FilteringSpanExporter({
      exporter: baseExporter,
      exportAppTelemetry,
    });

    // Metrics exporter for gRPC
    const metricReader = otlpEndpoint
      ? new PeriodicExportingMetricReader({
          exporter: new OTLPMetricExporter({
            url: otlpEndpoint
              .replace(/^https?:\/\//, '')
              .replace(/^grpcs?:\/\//, ''), // Remove http:// or grpc:// prefix for plain gRPC
            credentials: credentials.createInsecure(), // Use insecure credentials for plain gRPC (non-TLS)
          }),
          exportIntervalMillis: 5000, // Export every 5 seconds
        })
      : undefined;

    this.sdk = new NodeSDK({
      traceExporter,
      metricReader,
      resource,
      autoDetectResources: true,
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

    this.commandErrorCount = this.meter.createCounter(
      'cli.command.error.count',
      {
        description: 'Number of CLI commands that failed',
      },
    );

    this.commandSuccessCount = this.meter.createCounter(
      'cli.command.success.count',
      {
        description: 'Number of CLI commands that succeeded',
      },
    );

    // Token usage metrics
    this.tokenPromptCount = this.meter.createCounter('cli.ai.tokens.prompt', {
      description: 'Total prompt tokens used',
    });

    this.tokenCompletionCount = this.meter.createCounter(
      'cli.ai.tokens.completion',
      {
        description: 'Total completion tokens used',
      },
    );

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

    this.queryRowsReturned = this.meter.createHistogram(
      'cli.query.rows.returned',
      {
        description: 'Number of rows returned by queries',
      },
    );

    // Agent message metrics (for dashboard)
    this.messageDuration = this.meter.createHistogram(
      'agent.message.duration_ms',
      {
        description: 'Duration of agent message processing in milliseconds',
        unit: 'ms',
      },
    );

    // LLM token metrics (matching dashboard queries)
    this.tokensPrompt = this.meter.createCounter('ai.tokens.prompt', {
      description: 'Total prompt tokens consumed',
      unit: 'tokens',
    });

    this.tokensCompletion = this.meter.createCounter('ai.tokens.completion', {
      description: 'Total completion tokens generated',
      unit: 'tokens',
    });

    this.tokensTotal = this.meter.createCounter('ai.tokens.total', {
      description: 'Total tokens (prompt + completion)',
      unit: 'tokens',
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
    attributes?: Record<string, unknown>,
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
        } catch {
          // If serialization fails, convert to string
          serialized[key] = String(value);
        }
      }
    }
    return serialized;
  }

  startSpan(name: string, attributes?: Record<string, unknown>): Span {
    const tracer = trace.getTracer('qwery-telemetry');
    const serializedAttributes = this.serializeAttributes(attributes);
    // Use the active context to ensure proper span nesting
    const activeContext = context.active();
    const span = tracer.startSpan(
      name,
      { attributes: serializedAttributes },
      activeContext,
    );
    // Set the new span as active in the context (for proper nesting)
    trace.setSpan(activeContext, span);
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
    attributes?: Record<string, unknown>,
    parentSpanContexts?: Array<{
      context: SpanContext;
      attributes?: Record<string, string | number | boolean>;
    }>,
  ): Span {
    const tracer = trace.getTracer('qwery-telemetry');
    const serializedAttributes = this.serializeAttributes(attributes);
    const activeContext = context.active();

    // Create links from parent span contexts
    const links =
      parentSpanContexts?.map(
        ({ context: spanContext, attributes: linkAttributes }) => ({
          context: spanContext,
          attributes: linkAttributes
            ? this.serializeAttributes(linkAttributes)
            : undefined,
        }),
      ) || [];

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
    attributes?: Record<string, unknown>;
  }): void {
    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      try {
        const serializedAttributes = this.serializeAttributes(
          options.attributes,
        );
        activeSpan.addEvent(options.name, serializedAttributes);
      } catch (error) {
        // Ignore errors when trying to add events to ended spans
        // This can happen when onFinish callbacks run after spans have been ended
        if (
          error instanceof Error &&
          (error.message.includes('ended Span') ||
            error.message.includes('Operation attempted on ended') ||
            error.message.includes('Cannot execute') ||
            error.message.includes('isSpanEnded'))
        ) {
          // Silently ignore - span is already ended
          // This is expected when async callbacks (like onFinish) run after span completion
          return;
        }
        // Re-throw other errors
        throw error;
      }
    }
  }

  // Metrics recording methods
  recordCommandDuration(
    durationMs: number,
    attributes?: Record<string, string | number | boolean>,
  ): void {
    this.commandDuration.record(durationMs, attributes);
  }

  recordCommandCount(
    attributes?: Record<string, string | number | boolean>,
  ): void {
    this.commandCount.add(1, attributes);
  }

  recordCommandError(
    attributes?: Record<string, string | number | boolean>,
  ): void {
    this.commandErrorCount.add(1, attributes);
  }

  recordCommandSuccess(
    attributes?: Record<string, string | number | boolean>,
  ): void {
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

  recordQueryDuration(
    durationMs: number,
    attributes?: Record<string, string | number | boolean>,
  ): void {
    this.queryDuration.record(durationMs, attributes);
  }

  recordQueryCount(
    attributes?: Record<string, string | number | boolean>,
  ): void {
    this.queryCount.add(1, attributes);
  }

  recordQueryRowsReturned(
    rowCount: number,
    attributes?: Record<string, string | number | boolean>,
  ): void {
    this.queryRowsReturned.record(rowCount, attributes);
  }

  // Agent metrics recording methods
  recordMessageDuration(
    durationMs: number,
    attributes?: Record<string, string | number | boolean>,
  ): void {
    this.messageDuration.record(durationMs, attributes);
  }

  recordAgentTokenUsage(
    promptTokens: number,
    completionTokens: number,
    attributes?: Record<string, string | number | boolean>,
  ): void {
    this.tokensPrompt.add(promptTokens, attributes);
    this.tokensCompletion.add(completionTokens, attributes);
    this.tokensTotal.add(promptTokens + completionTokens, attributes);
  }
}
