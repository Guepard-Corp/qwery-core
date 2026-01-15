// packages/telemetry/src/otel/manager.ts
import {
  context,
  metrics,
  Span,
  SpanContext,
  SpanStatusCode,
  trace,
  type Meter,
} from '@opentelemetry/api';
import { OtelClientService } from './client-service';
import { getTelemetryConfig, type TelemetryConfig } from './config';
import { isDebugEnabled, secureRandomStringBase36 } from './telemetry-utils';
import { isNode } from './module-loader';
import { serializeAttributes, createNoOpSpan } from './span-utils';
import { MetricsManager } from './metrics-manager';
import { initializeNodeSDK } from './sdk-initializer';

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
  private config: TelemetryConfig;
  private metricsManager: MetricsManager;

  constructor(
    serviceName: string = 'qwery-app',
    sessionId?: string,
    options?: OtelTelemetryManagerOptions,
  ) {
    this.config = getTelemetryConfig(options);
    this.serviceName = serviceName;

    // If telemetry is disabled, create a minimal no-op instance
    if (!this.config.enabled) {
      if (isDebugEnabled()) {
        console.log(
          '[Telemetry] OpenTelemetry SDK is disabled by QWERY_TELEMETRY_ENABLED=false',
        );
      }
      this.sessionId = sessionId || `${serviceName}-disabled-${Date.now()}`;
      this.clientService = new OtelClientService(undefined); // No-op client
      this.meter = metrics.getMeter('qwery-null-telemetry', '1.0.0'); // No-op meter
      this.metricsManager = new MetricsManager(this.meter, this.config);
      this.sdk = null;
      return;
    }

    this.sessionId = sessionId || this.generateSessionId();
    this.clientService = new OtelClientService(this);

    // Initialize metrics (this doesn't require Node.js modules)
    this.meter = metrics.getMeter('qwery-cli', '1.0.0');
    this.metricsManager = new MetricsManager(this.meter, this.config);

    // Lazy initialize Node.js SDK (only in Node.js environment)
    if (isNode) {
      this.initPromise = this.initializeNodeSDK(options);
    }
  }

  private async initializeNodeSDK(
    options?: OtelTelemetryManagerOptions,
  ): Promise<void> {
    this.sdk = await initializeNodeSDK({
      serviceName: this.serviceName,
      sessionId: this.sessionId,
      options,
    });
  }

  private generateSessionId(): string {
    try {
      const prefix = this.serviceName.includes('cli') ? 'cli' : 'web';
      const randomString = secureRandomStringBase36(7);
      const sessionId = `${prefix}-${Date.now()}-${randomString}`;
      if (isDebugEnabled()) {
        console.log('[Telemetry] Generated session ID:', sessionId);
      }
      return sessionId;
    } catch (error) {
      if (isDebugEnabled()) {
        console.error('[Telemetry] Error generating session ID:', error);
      }
      // Fallback session ID
      const fallbackId = `${this.serviceName}-${Date.now()}-fallback`;
      if (isDebugEnabled()) {
        console.log('[Telemetry] Using fallback session ID:', fallbackId);
      }
      return fallbackId;
    }
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
        if (isDebugEnabled()) {
          console.log('[Telemetry] Starting NodeSDK...');
        }
        await this.sdk.start();
        if (isDebugEnabled()) {
          console.log('OtelTelemetryManager: OpenTelemetry initialized.');
          console.log(
            '[Telemetry] NodeSDK started - PeriodicExportingMetricReader should now be active',
          );
        }

        if (isDebugEnabled()) {
          setTimeout(() => {
            console.log(
              '[Telemetry] Test: Recording a dummy metric to trigger export...',
            );
            this.metricsManager.getTokenTotalCount().add(1, { test: 'true' });
            console.log(
              '[Telemetry] Test metric recorded - export should trigger in next 5 seconds',
            );
          }, 2000);
        }
      }
    } catch (error) {
      if (isDebugEnabled()) {
        console.error('OtelTelemetryManager init error:', error);
      }
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
        if (isDebugEnabled()) {
          console.log('OtelTelemetryManager: OpenTelemetry shutdown complete.');
        }
      }
    } catch (error) {
      if (isDebugEnabled()) {
        console.error('OtelTelemetryManager shutdown error:', error);
      }
    }
  }

  startSpan(name: string, attributes?: Record<string, unknown>): Span {
    if (!this.config.enabled) {
      return createNoOpSpan();
    }
    const tracer = trace.getTracer('qwery-telemetry');
    const serializedAttributes = serializeAttributes(attributes);
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
    if (!this.config.enabled) {
      return createNoOpSpan();
    }
    const tracer = trace.getTracer('qwery-telemetry');
    const serializedAttributes = serializeAttributes(attributes);
    const activeContext = context.active();

    // Create links from parent span contexts
    const links =
      parentSpanContexts?.map(
        ({ context: spanContext, attributes: linkAttributes }) => ({
          context: spanContext,
          attributes: linkAttributes
            ? serializeAttributes(linkAttributes)
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
    if (!this.config.enabled) {
      return;
    }
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
    if (!this.config.enabled) {
      return;
    }
    const activeSpan = trace.getActiveSpan();
    if (activeSpan && activeSpan.isRecording()) {
      try {
        const serializedAttributes = serializeAttributes(options.attributes);
        activeSpan.addEvent(options.name, serializedAttributes);
      } catch {
        // Silently ignore if span ended between check and execution
        return;
      }
    }
  }

  // Metrics recording methods - delegate to MetricsManager
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

  // Agent metrics recording methods
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

// Export as TelemetryManager for backward compatibility
export { OtelTelemetryManager as TelemetryManager };
export type { OtelTelemetryManagerOptions as TelemetryManagerOptions };
