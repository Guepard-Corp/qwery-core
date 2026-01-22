import {
  context,
  metrics,
  Span,
  SpanContext,
  SpanStatusCode,
  trace,
  type Meter,
} from '@opentelemetry/api';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base';
import { NodeSDK } from '@opentelemetry/sdk-node';
import {
  PeriodicExportingMetricReader,
  ConsoleMetricExporter,
} from '@opentelemetry/sdk-metrics';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { credentials } from '@grpc/grpc-js';

import { OtelClientService } from '../client-service';
import { getTelemetryConfig, type TelemetryConfig } from '../config';
import { isDebugEnabled, secureRandomStringBase36 } from '../telemetry-utils';
import { serializeAttributes, createNoOpSpan } from '../span-utils';
import { MetricsManager } from '../metrics-manager';
import { FilteringSpanExporter } from '../filtering-exporter';
import { SafeOTLPMetricExporter } from './safe-metric-exporter';
import { SafeOTLPSpanExporter } from './safe-span-exporter';

export interface OtelTelemetryManagerOptions {
  exportAppTelemetry?: boolean;
  exportMetrics?: boolean;
}

export class TelemetryManager {
  private sdk: NodeSDK | null = null;
  public clientService: OtelClientService;
  private serviceName: string;
  private sessionId: string;
  private meter: Meter;
  private config: TelemetryConfig;
  private metricsManager: MetricsManager;

  constructor(
    serviceName: string = 'qwery-app',
    sessionId?: string,
    options?: OtelTelemetryManagerOptions,
  ) {
    this.config = getTelemetryConfig(options);
    this.serviceName = serviceName;

    if (!this.config.enabled) {
      if (isDebugEnabled()) {
        console.log(
          '[Telemetry] OpenTelemetry SDK is disabled by QWERY_TELEMETRY_ENABLED=false',
        );
      }
      this.sessionId = sessionId || `${serviceName}-disabled-${Date.now()}`;
      this.clientService = new OtelClientService(undefined);
      this.meter = metrics.getMeter('qwery-null-telemetry', '1.0.0');
      this.metricsManager = new MetricsManager(this.meter, this.config);
      this.sdk = null;
      return;
    }

    this.sessionId = sessionId || this.generateSessionId();
    this.clientService = new OtelClientService(this);
    this.meter = metrics.getMeter('qwery-cli', '1.0.0');
    this.metricsManager = new MetricsManager(this.meter, this.config);

    this.initializeSDK(options);
  }

  private initializeSDK(_options?: OtelTelemetryManagerOptions): void {
    const resource = resourceFromAttributes({
      [ATTR_SERVICE_NAME]: this.serviceName,
      'session.id': this.sessionId,
    });

    const { otlpEndpoint, exportAppTelemetry, exportMetrics } = this.config;

    const baseExporter = otlpEndpoint
      ? new SafeOTLPSpanExporter(
          otlpEndpoint,
          this.createOTLPTraceExporter(otlpEndpoint),
        )
      : new ConsoleSpanExporter();

    const traceExporter = new FilteringSpanExporter({
      exporter: baseExporter,
      exportAppTelemetry,
    });

    const metricReader = this.createMetricReader(otlpEndpoint, exportMetrics);

    this.sdk = new NodeSDK({
      traceExporter,
      metricReaders: metricReader ? [metricReader] : undefined,
      resource,
      autoDetectResources: true,
    });
  }

  private createOTLPTraceExporter(endpoint: string): OTLPTraceExporter {
    const cleanedEndpoint = endpoint.trim().replace(/^["']|["']$/g, '');
    const grpcUrl = cleanedEndpoint
      .replace(/^https?:\/\//, '')
      .replace(/^grpcs?:\/\//, '');
    return new OTLPTraceExporter({
      url: grpcUrl,
      credentials: credentials.createInsecure(),
    });
  }

  private createMetricReader(
    otlpEndpoint: string | undefined,
    exportMetrics: boolean,
  ): PeriodicExportingMetricReader | undefined {
    if (isDebugEnabled()) {
      return new PeriodicExportingMetricReader({
        exporter: new ConsoleMetricExporter(),
        exportIntervalMillis: 2000,
      });
    }

    if (!otlpEndpoint || !exportMetrics) {
      return undefined;
    }

    const cleanedEndpoint = otlpEndpoint.trim().replace(/^["']|["']$/g, '');
    const grpcUrl = cleanedEndpoint
      .replace(/^https?:\/\//, '')
      .replace(/^grpcs?:\/\//, '');
    const otlpMetricExporter = new OTLPMetricExporter({
      url: grpcUrl,
      credentials: credentials.createInsecure(),
    });

    const safeMetricExporter = new SafeOTLPMetricExporter(
      otlpEndpoint,
      otlpMetricExporter,
    );

    return new PeriodicExportingMetricReader({
      exporter: safeMetricExporter as unknown as OTLPMetricExporter,
      exportIntervalMillis: 5000,
    });
  }

  private generateSessionId(): string {
    try {
      const prefix = this.serviceName.includes('cli') ? 'cli' : 'web';
      const randomString = secureRandomStringBase36(7);
      return `${prefix}-${Date.now()}-${randomString}`;
    } catch {
      return `${this.serviceName}-${Date.now()}-fallback`;
    }
  }

  getSessionId(): string {
    return this.sessionId;
  }

  async init() {
    if (!this.sdk) return;
    try {
      await this.sdk.start();
      if (isDebugEnabled()) {
        console.log('TelemetryManager: OpenTelemetry initialized.');
      }
    } catch (error) {
      if (isDebugEnabled()) {
        console.error('TelemetryManager init error:', error);
      }
    }
  }

  async shutdown() {
    if (!this.sdk) return;
    try {
      await this.sdk.shutdown();
      if (isDebugEnabled()) {
        console.log('TelemetryManager: OpenTelemetry shutdown complete.');
      }
    } catch (error) {
      if (isDebugEnabled()) {
        console.error('TelemetryManager shutdown error:', error);
      }
    }
  }

  startSpan(name: string, attributes?: Record<string, unknown>): Span {
    if (!this.config.enabled) {
      return createNoOpSpan();
    }
    const tracer = trace.getTracer('qwery-telemetry');
    const serializedAttributes = serializeAttributes(attributes);
    const activeContext = context.active();
    const span = tracer.startSpan(
      name,
      { attributes: serializedAttributes },
      activeContext,
    );
    trace.setSpan(activeContext, span);
    return span;
  }

  startSpanWithLinks(
    name: string,
    attributes?: Record<string, unknown>,
    parentSpanContexts?: Array<{
      context: SpanContext;
      attributes?: Record<string, string | number | boolean>;
    }>,
  ): Span {
    if (!this.config.enabled) {
      return createNoOpSpan();
    }
    const tracer = trace.getTracer('qwery-telemetry');
    const serializedAttributes = serializeAttributes(attributes);
    const activeContext = context.active();

    const links =
      parentSpanContexts?.map(
        ({ context: spanContext, attributes: linkAttributes }) => ({
          context: spanContext,
          attributes: linkAttributes
            ? serializeAttributes(linkAttributes)
            : undefined,
        }),
      ) || [];

    return tracer.startSpan(
      name,
      { attributes: serializedAttributes, links },
      activeContext,
    );
  }

  endSpan(span: Span, success: boolean): void {
    if (!this.config.enabled) return;
    span.setStatus({
      code: success ? SpanStatusCode.OK : SpanStatusCode.ERROR,
    });
    span.end();
  }

  captureEvent(options: {
    name: string;
    attributes?: Record<string, unknown>;
  }): void {
    if (!this.config.enabled) return;
    const activeSpan = trace.getActiveSpan();
    if (activeSpan?.isRecording()) {
      try {
        activeSpan.addEvent(
          options.name,
          serializeAttributes(options.attributes),
        );
      } catch {
        // Silently ignore if span ended
      }
    }
  }

  // Metrics methods
  recordCommandDuration(
    durationMs: number,
    attributes?: Record<string, string | number | boolean>,
  ): void {
    this.metricsManager.recordCommandDuration(durationMs, attributes);
  }

  recordCommandCount(
    attributes?: Record<string, string | number | boolean>,
  ): void {
    this.metricsManager.recordCommandCount(attributes);
  }

  recordCommandError(
    attributes?: Record<string, string | number | boolean>,
  ): void {
    this.metricsManager.recordCommandError(attributes);
  }

  recordCommandSuccess(
    attributes?: Record<string, string | number | boolean>,
  ): void {
    this.metricsManager.recordCommandSuccess(attributes);
  }

  recordTokenUsage(
    promptTokens: number,
    completionTokens: number,
    attributes?: Record<string, string | number | boolean>,
  ): void {
    this.metricsManager.recordTokenUsage(
      promptTokens,
      completionTokens,
      attributes,
    );
  }

  recordQueryDuration(
    durationMs: number,
    attributes?: Record<string, string | number | boolean>,
  ): void {
    this.metricsManager.recordQueryDuration(durationMs, attributes);
  }

  recordQueryCount(
    attributes?: Record<string, string | number | boolean>,
  ): void {
    this.metricsManager.recordQueryCount(attributes);
  }

  recordQueryRowsReturned(
    rowCount: number,
    attributes?: Record<string, string | number | boolean>,
  ): void {
    this.metricsManager.recordQueryRowsReturned(rowCount, attributes);
  }

  recordMessageDuration(
    durationMs: number,
    attributes?: Record<string, string | number | boolean>,
  ): void {
    this.metricsManager.recordMessageDuration(durationMs, attributes);
  }

  recordAgentTokenUsage(
    promptTokens: number,
    completionTokens: number,
    attributes?: Record<string, string | number | boolean>,
  ): void {
    this.metricsManager.recordAgentTokenUsage(
      promptTokens,
      completionTokens,
      attributes,
    );
  }
}

export type { OtelTelemetryManagerOptions as TelemetryManagerOptions };
