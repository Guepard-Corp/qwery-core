// packages/telemetry/src/otel/manager.ts
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
import { OtelClientService } from './client-service';
import { FilteringSpanExporter } from './filtering-exporter';

// Lazy load Node.js-only OpenTelemetry packages to avoid bundling in browser
// These are only loaded when actually needed in Node.js environments
let nodeSdkModule: typeof import('@opentelemetry/sdk-node') | null = null;
let otlpTraceExporterModule: typeof import('@opentelemetry/exporter-trace-otlp-grpc') | null = null;
let otlpMetricExporterModule: typeof import('@opentelemetry/exporter-metrics-otlp-grpc') | null = null;
let sdkMetricsModule: typeof import('@opentelemetry/sdk-metrics') | null = null;
let grpcModule: typeof import('@grpc/grpc-js') | null = null;
let resourcesModule: typeof import('@opentelemetry/resources') | null = null;
let semanticConventionsModule: typeof import('@opentelemetry/semantic-conventions') | null = null;

// Check if we're in Node.js environment
const isNode = typeof process !== 'undefined' && process.versions?.node;

async function loadNodeModules() {
  if (!isNode) {
    throw new Error('OpenTelemetry Node.js modules are only available in Node.js environment');
  }

  if (!nodeSdkModule) {
    nodeSdkModule = await import('@opentelemetry/sdk-node');
  }
  if (!otlpTraceExporterModule) {
    otlpTraceExporterModule = await import('@opentelemetry/exporter-trace-otlp-grpc');
  }
  if (!otlpMetricExporterModule) {
    otlpMetricExporterModule = await import('@opentelemetry/exporter-metrics-otlp-grpc');
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
    semanticConventionsModule = await import('@opentelemetry/semantic-conventions');
  }

  return {
    NodeSDK: nodeSdkModule.NodeSDK,
    OTLPTraceExporter: otlpTraceExporterModule.OTLPTraceExporter,
    OTLPMetricExporter: otlpMetricExporterModule.OTLPMetricExporter,
    PeriodicExportingMetricReader: sdkMetricsModule.PeriodicExportingMetricReader,
    credentials: grpcModule.credentials,
    resourceFromAttributes: resourcesModule.resourceFromAttributes,
    ATTR_SERVICE_NAME: semanticConventionsModule.ATTR_SERVICE_NAME,
  };
}

// Enable OpenTelemetry internal logging (optional) - only in Node.js
if (isNode) {
  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);
}

/**
 * Wraps an OTLP exporter to gracefully handle errors (e.g., when Jaeger is not running)
 * Falls back to console logging on error instead of crashing
 */
class SafeOTLPExporter implements SpanExporter {
  private otlpExporter: InstanceType<typeof import('@opentelemetry/exporter-trace-otlp-grpc').OTLPTraceExporter> | null = null;
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
      // For gRPC, remove http:// or https:// prefix if present
      // gRPC expects format: host:port (e.g., "10.103.227.71:4317")
      // Use plain text (non-TLS) connection
      const grpcUrl = this.baseEndpoint.replace(/^https?:\/\//, '');
      // Ensure we're using plain gRPC (not grpcs:// which would use TLS)
      const plainGrpcUrl = grpcUrl.replace(/^grpcs?:\/\//, '');
      this.otlpExporter = new modules.OTLPTraceExporter({
        url: plainGrpcUrl,
        credentials: modules.credentials.createInsecure(), // Use insecure credentials for plain gRPC (non-TLS)
      });
    } catch (error) {
      // If initialization fails, we'll just use console exporter
      console.warn('[Telemetry] Failed to initialize OTLP exporter:', error);
    }
  }

  private firstSuccess = false;

  export(
    spans: ReadableSpan[],
    resultCallback: (result: { code: number; error?: Error }) => void,
  ): void {
    // Ensure OTLP exporter is initialized
    if (this.initPromise) {
      this.initPromise.then(() => {
        this.exportInternal(spans, resultCallback);
      }).catch(() => {
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
    // Try OTLP export first, with error handling
    if (!this.otlpExporter) {
      // Fallback to console if OTLP not available
      this.consoleExporter.export(spans, resultCallback);
      return;
    }

    try {
      this.otlpExporter.export(spans, (result) => {
        // Only treat as failure if there's an actual error object
        const hasError = result.error !== undefined && result.error !== null;

        if (!hasError) {
          // Success - reset error count
          this.errorCount = 0;
          if (!this.firstSuccess) {
            this.firstSuccess = true;
            console.log(
              '[Telemetry] OTLP Trace export connection established successfully.',
            );
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
      this.otlpExporter?.shutdown().catch(() => {}) || Promise.resolve(),
      this.consoleExporter.shutdown().catch(() => {}),
    ]).then(() => {});
  }
}

/**
 * Configuration options for OtelTelemetryManager
 */
export interface OtelTelemetryManagerOptions {
  /**
   * Whether to export app-specific telemetry (cli, web, desktop spans)
   * General spans (agents, actors, LLM) are always exported regardless of this setting.
   * Default: true (for backward compatibility)
   * Can be overridden by QWERY_EXPORT_APP_TELEMETRY environment variable
   */
  exportAppTelemetry?: boolean;
  /**
   * Whether to export metrics to OTLP collector.
   * Set to false if your collector doesn't support metrics service.
   * Default: true (for backward compatibility)
   * Can be overridden by QWERY_EXPORT_METRICS environment variable
   */
  exportMetrics?: boolean;
}

/**
 * OpenTelemetry Telemetry Manager
 * 
 * Manages OpenTelemetry SDK, spans, metrics, and events.
 * Supports multiple backends: OTLP (Jaeger), Console, etc.
 */
export class OtelTelemetryManager {
  private sdk: InstanceType<typeof import('@opentelemetry/sdk-node').NodeSDK> | null = null;
  public clientService: OtelClientService;
  private serviceName: string;
  private sessionId: string;
  private meter: Meter;
  private initPromise: Promise<void> | null = null;

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
    options?: OtelTelemetryManagerOptions,
  ) {
    this.serviceName = serviceName;
    this.sessionId = sessionId || this.generateSessionId();
    this.clientService = new OtelClientService(this);

    // Initialize metrics (this doesn't require Node.js modules)
    this.meter = metrics.getMeter('qwery-cli', '1.0.0');
    this.initializeMetrics();

    // Lazy initialize Node.js SDK (only in Node.js environment)
    if (isNode) {
      this.initPromise = this.initializeNodeSDK(options);
    }
  }

  private async initializeNodeSDK(options?: OtelTelemetryManagerOptions): Promise<void> {
    try {
      const modules = await loadNodeModules();

      // Create Resource using semantic conventions
      const resource = modules.resourceFromAttributes({
        [modules.ATTR_SERVICE_NAME]: this.serviceName,
        'session.id': this.sessionId,
      });

      // Use ConsoleSpanExporter for local/CLI testing (prints spans to console)
      // OTLP exporter is optional and only used if OTEL_EXPORTER_OTLP_ENDPOINT is set
      //const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
      const otlpEndpoint = 'http://34.71.179.124:4317';

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

      // Metrics exporter for gRPC (optional - only if collector supports metrics)
      // Resolve exportMetrics setting:
      // 1. Check environment variable (QWERY_EXPORT_METRICS)
      // 2. Check options parameter
      // 3. Default to false (many collectors don't support metrics service)
      const exportMetricsEnv =
        process.env.QWERY_EXPORT_METRICS !== undefined
          ? process.env.QWERY_EXPORT_METRICS === 'true'
          : undefined;
      const exportMetrics =
        exportMetricsEnv ?? options?.exportMetrics ?? true;

      // Create metric reader only if metrics export is enabled
      // Note: Metrics are still collected via the Meter API, just not exported
      // This prevents errors when collector doesn't support metrics service
      const metricReader =
        otlpEndpoint && exportMetrics
          ? new modules.PeriodicExportingMetricReader({
              exporter: new modules.OTLPMetricExporter({
                url: otlpEndpoint
                  .replace(/^https?:\/\//, '')
                  .replace(/^grpcs?:\/\//, ''), // Remove http:// or grpc:// prefix for plain gRPC
                credentials: modules.credentials.createInsecure(), // Use insecure credentials for plain gRPC (non-TLS)
              }),
              exportIntervalMillis: 5000, // Export every 5 seconds
            })
          : undefined;

      this.sdk = new modules.NodeSDK({
        traceExporter,
        metricReader,
        resource,
        autoDetectResources: true,
      });
    } catch (error) {
      console.warn('[Telemetry] Failed to initialize Node.js SDK:', error);
    }
  }

  private generateSessionId(): string {
    const prefix = this.serviceName.includes('cli') ? 'cli' : 'web';
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
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
      // Wait for SDK initialization if it's still in progress
      if (this.initPromise) {
        await this.initPromise;
      }
      if (this.sdk) {
        await this.sdk.start();
        console.log('OtelTelemetryManager: OpenTelemetry initialized.');
      }
    } catch (error) {
      console.error('OtelTelemetryManager init error:', error);
    }
  }

  async shutdown() {
    try {
      // Wait for SDK initialization if it's still in progress
      if (this.initPromise) {
        await this.initPromise;
      }
      if (this.sdk) {
        await this.sdk.shutdown();
        console.log('OtelTelemetryManager: OpenTelemetry shutdown complete.');
      }
    } catch (error) {
      console.error('OtelTelemetryManager shutdown error:', error);
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
    if (activeSpan && activeSpan.isRecording()) {
      try {
        const serializedAttributes = this.serializeAttributes(
          options.attributes,
        );
        activeSpan.addEvent(options.name, serializedAttributes);
      } catch {
        // Silently ignore if span ended between check and execution
        return;
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

// Export as TelemetryManager for backward compatibility
export { OtelTelemetryManager as TelemetryManager };
export type { OtelTelemetryManagerOptions as TelemetryManagerOptions };

