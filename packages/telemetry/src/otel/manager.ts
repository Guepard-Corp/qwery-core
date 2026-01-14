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

const isNode = typeof process !== 'undefined' && process.versions?.node;

function secureRandomStringBase36(length: number): string {
  // Prefer randomUUID when available (Node + modern browsers).
  const uuidFn = globalThis.crypto?.randomUUID;
  if (typeof uuidFn === 'function') {
    // randomUUID() is cryptographically secure; compact to base36-ish chars.
    const compact = uuidFn().replaceAll('-', '');
    // hex -> base36-ish (still plenty of entropy for a session id suffix)
    return BigInt(`0x${compact}`).toString(36).slice(0, length);
  }

  // Fallback: WebCrypto getRandomValues (also cryptographically secure).
  const webCrypto = globalThis.crypto;
  if (webCrypto && typeof webCrypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(Math.max(8, Math.ceil(length * 0.75)));
    webCrypto.getRandomValues(bytes);
    return Array.from(bytes)
      .map((b) => b.toString(36))
      .join('')
      .slice(0, length);
  }

  // Extremely old runtimes only. Keep deterministic + low risk of collision,
  // but avoid importing Node builtins that Vite may externalize in the browser.
  return `${Date.now().toString(36)}${length}`;
}

async function loadNodeModules() {
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

if (isNode) {
  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);
}

class SafeOTLPMetricExporter {
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
    console.log(
      `[Telemetry] SafeOTLPMetricExporter created for endpoint: ${baseEndpoint}`,
    );
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

      console.log(
        `[Telemetry] OTLPMetricExporter initialized for: ${plainGrpcUrl}`,
      );

      // Wrap the export method to catch errors
      this.wrapExportMethod();

      // Also create console exporter for fallback
      this.consoleExporter = new modules.ConsoleMetricExporter();
    } catch (error) {
      console.warn(
        '[Telemetry] Failed to initialize OTLP metric exporter:',
        error,
      );
    }
  }

  private wrapExportMethod(): void {
    if (!this.otlpExporter) return;

    const originalExport = this.otlpExporter.export.bind(this.otlpExporter);
    this.otlpExporter.export = async (metrics, resultCallback) => {
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
      console.log('[Telemetry] Attempting to export metrics:', {
        metricCount,
        resourceCount: resourceMetrics.length,
        timestamp: new Date().toISOString(),
        endpoint: this.baseEndpoint,
      });

      try {
        await originalExport(metrics, (result) => {
          const hasError = result.error !== undefined && result.error !== null;

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

          if (!hasError) {
            // Success - reset error count
            this.errorCount = 0;
            if (!this.firstSuccess) {
              this.firstSuccess = true;
              console.log(
                '[Telemetry] OTLP Metrics export connection established successfully.',
              );
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
          if (!this.metricsErrorLogged) {
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
          if (process.env.QWERY_TELEMETRY_DEBUG === 'true') {
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

        if (!this.metricsErrorLogged) {
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
    console.log(
      '[Telemetry] SafeOTLPMetricExporter.export() called!',
      new Date().toISOString(),
    );

    // Ensure exporters are initialized
    if (this.initPromise) {
      console.log(
        '[Telemetry] Waiting for exporter initialization...',
        new Date().toISOString(),
      );
      await this.initPromise;
      console.log(
        '[Telemetry] Exporter initialization complete',
        new Date().toISOString(),
      );
    }

    if (!this.otlpExporter) {
      console.warn(
        '[Telemetry] OTLP exporter not initialized, falling back to console',
      );
      // Fallback to console if OTLP not available
      if (this.consoleExporter) {
        this.consoleExporter.export(metrics, resultCallback);
      }
      return;
    }

    console.log(
      '[Telemetry] Calling wrapped otlpExporter.export()...',
      new Date().toISOString(),
    );

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

class SafeOTLPExporter implements SpanExporter {
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
  private sdk: InstanceType<
    typeof import('@opentelemetry/sdk-node').NodeSDK
  > | null = null;
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

  private async initializeNodeSDK(
    options?: OtelTelemetryManagerOptions,
  ): Promise<void> {
    try {
      const modules = await loadNodeModules();

      // Create Resource using semantic conventions
      const resource = modules.resourceFromAttributes({
        [modules.ATTR_SERVICE_NAME]: this.serviceName,
        'session.id': this.sessionId,
      });

      const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

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

      const exportMetricsEnv =
        process.env.QWERY_EXPORT_METRICS !== undefined
          ? process.env.QWERY_EXPORT_METRICS === 'true'
          : undefined;
      const exportMetrics = exportMetricsEnv ?? options?.exportMetrics ?? true;

      const isDebugMode = process.env.QWERY_TELEMETRY_DEBUG === 'true';
      const metricReader = isDebugMode
        ? (() => {
            console.log(
              '[Telemetry] Debug mode enabled: Using ConsoleMetricExporter for metrics',
            );
            return new modules.PeriodicExportingMetricReader({
              exporter: new modules.ConsoleMetricExporter(), // Console exporter for debugging
              exportIntervalMillis: 2000, // More frequent for debugging
            });
          })()
        : otlpEndpoint && exportMetrics
          ? (() => {
              console.log(
                `[Telemetry] Using OTLP MetricExporter for metrics (endpoint: ${otlpEndpoint})`,
              );
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

              console.log(
                '[Telemetry] Creating PeriodicExportingMetricReader with SafeOTLPMetricExporter',
              );
              console.log(
                `[Telemetry] SafeOTLPMetricExporter has export method: ${typeof safeMetricExporter.export === 'function'}`,
              );
              const reader = new modules.PeriodicExportingMetricReader({
                exporter: safeMetricExporter as unknown as InstanceType<
                  typeof modules.OTLPMetricExporter
                >, // Pass SafeOTLPMetricExporter directly - it implements the interface
                exportIntervalMillis: 5000, // Export every 5 seconds
              });
              console.log(
                '[Telemetry] PeriodicExportingMetricReader created, will export every 5 seconds',
              );
              return reader;
            })()
          : (() => {
              console.log(
                '[Telemetry] Metrics export disabled (no OTLP endpoint or exportMetrics=false)',
              );
              return undefined;
            })();

      this.sdk = new modules.NodeSDK({
        traceExporter,
        metricReaders: metricReader ? [metricReader] : undefined,
        resource,
        autoDetectResources: true,
      });

      // Log metric reader details
      if (metricReader) {
        console.log(
          `[Telemetry] NodeSDK created with metricReader: ${metricReader.constructor.name}`,
        );
        console.log(
          `[Telemetry] MetricReader type check: ${metricReader instanceof modules.PeriodicExportingMetricReader ? 'PeriodicExportingMetricReader' : 'Unknown'}`,
        );
      }

      // Log metrics pipeline status
      if (metricReader) {
        console.log(
          '[Telemetry] Metrics pipeline initialized successfully. Metrics will be exported every 5 seconds.',
        );
        if (process.env.QWERY_TELEMETRY_DEBUG === 'true') {
          console.log(
            '[Telemetry] Debug mode: All metric recordings will be logged.',
          );
        }
      }
    } catch (error) {
      console.warn('[Telemetry] Failed to initialize Node.js SDK:', error);
    }
  }

  private generateSessionId(): string {
    const prefix = this.serviceName.includes('cli') ? 'cli' : 'web';
    const randomString = secureRandomStringBase36(7);
    return `${prefix}-${Date.now()}-${randomString}`;
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
        console.log('[Telemetry] Starting NodeSDK...');
        await this.sdk.start();
        console.log('OtelTelemetryManager: OpenTelemetry initialized.');
        console.log(
          '[Telemetry] NodeSDK started - PeriodicExportingMetricReader should now be active',
        );

        setTimeout(() => {
          console.log(
            '[Telemetry] Test: Recording a dummy metric to trigger export...',
          );
          this.tokenTotalCount.add(1, { test: 'true' });
          console.log(
            '[Telemetry] Test metric recorded - export should trigger in next 5 seconds',
          );
        }, 2000);
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
    if (process.env.QWERY_TELEMETRY_DEBUG === 'true') {
      console.log('[Telemetry] Recording token usage:', {
        promptTokens,
        completionTokens,
        total: promptTokens + completionTokens,
        attributes,
        timestamp: new Date().toISOString(),
      });
    }
    this.tokenPromptCount.add(promptTokens, attributes);
    this.tokenCompletionCount.add(completionTokens, attributes);
    this.tokenTotalCount.add(promptTokens + completionTokens, attributes);
  }

  recordQueryDuration(
    durationMs: number,
    attributes?: Record<string, string | number | boolean>,
  ): void {
    if (process.env.QWERY_TELEMETRY_DEBUG === 'true') {
      console.log('[Telemetry] Recording query duration:', {
        durationMs,
        attributes,
        timestamp: new Date().toISOString(),
      });
    }
    this.queryDuration.record(durationMs, attributes);
  }

  recordQueryCount(
    attributes?: Record<string, string | number | boolean>,
  ): void {
    if (process.env.QWERY_TELEMETRY_DEBUG === 'true') {
      console.log('[Telemetry] Recording query count:', {
        attributes,
        timestamp: new Date().toISOString(),
      });
    }
    this.queryCount.add(1, attributes);
  }

  recordQueryRowsReturned(
    rowCount: number,
    attributes?: Record<string, string | number | boolean>,
  ): void {
    if (process.env.QWERY_TELEMETRY_DEBUG === 'true') {
      console.log('[Telemetry] Recording query rows returned:', {
        rowCount,
        attributes,
        timestamp: new Date().toISOString(),
      });
    }
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
    if (process.env.QWERY_TELEMETRY_DEBUG === 'true') {
      console.log('[Telemetry] Recording agent token usage:', {
        promptTokens,
        completionTokens,
        total: promptTokens + completionTokens,
        attributes,
        timestamp: new Date().toISOString(),
      });
    }
    // Validate token values before recording (prevent negative or invalid values)
    if (promptTokens < 0 || completionTokens < 0) {
      console.warn('[Telemetry] Invalid token values detected:', {
        promptTokens,
        completionTokens,
        attributes,
      });
      return;
    }
    this.tokensPrompt.add(promptTokens, attributes);
    this.tokensCompletion.add(completionTokens, attributes);
    this.tokensTotal.add(promptTokens + completionTokens, attributes);
  }
}

// Export as TelemetryManager for backward compatibility
export { OtelTelemetryManager as TelemetryManager };
export type { OtelTelemetryManagerOptions as TelemetryManagerOptions };
