// packages/telemetry/src/otel/client-service.ts

import type { OtelTelemetryManager } from './manager';
import type { Span } from '@opentelemetry/api';

export type TelemetryEvent = {
  name: string;
  timestamp?: number;
  attributes?: Record<string, unknown>;
  sessionId?: string;
};

/**
 * OpenTelemetry Client Telemetry Service
 *
 * Provides simple APIs for CLI, web, and desktop applications.
 * Integrates with OtelTelemetryManager for underlying OpenTelemetry logic.
 * Handles workspace context enrichment automatically.
 */
export class OtelClientService {
  private telemetry: OtelTelemetryManager | null = null;
  private queue: TelemetryEvent[] = [];
  private maxQueueSize = 50; // batch before sending
  private flushInterval = 5000; // flush every 5s
  private flushing = false;
  private flushTimer?: NodeJS.Timeout;

  constructor(telemetry?: OtelTelemetryManager) {
    if (telemetry) {
      this.telemetry = telemetry;
    }
    // Start periodic flush
    this.startFlushTimer();
  }

  /**
   * Set the underlying telemetry manager
   */
  setTelemetryManager(telemetry: OtelTelemetryManager): void {
    this.telemetry = telemetry;
  }

  /**
   * Get session ID from telemetry manager or generate one
   */
  getSessionId(): string {
    return this.telemetry?.getSessionId() || 'client-session';
  }

  /**
   * Track a command execution
   */
  trackCommand(
    command: string,
    args?: Record<string, unknown>,
    success?: boolean,
    durationMs?: number,
  ): void {
    if (this.telemetry) {
      const attributes: Record<string, unknown> = {
        'client.command': command,
      };
      if (args) {
        attributes['client.command.args'] = JSON.stringify(args);
      }
      if (durationMs !== undefined) {
        attributes['client.command.duration_ms'] = String(durationMs);
      }

      this.telemetry.captureEvent({
        name: success ? 'client.command.success' : 'client.command.error',
        attributes,
      });
    } else {
      // Fallback to queue
      this.captureEvent({
        name: 'client.command',
        attributes: { command, args, success, durationMs },
      });
    }
  }

  /**
   * Track a generic event
   */
  trackEvent(event: string, properties?: Record<string, unknown>): void {
    if (this.telemetry) {
      this.telemetry.captureEvent({
        name: event,
        attributes: properties,
      });
    } else {
      // Fallback to queue
      this.captureEvent({
        name: event,
        attributes: properties,
      });
    }
  }

  /**
   * Track a metric
   */
  trackMetric(
    name: string,
    value: number,
    attributes?: Record<string, string | number | boolean>,
  ): void {
    // Note: TelemetryManager doesn't have a generic trackMetric method
    // This could be extended in the future
    if (this.telemetry) {
      this.telemetry.captureEvent({
        name: 'client.metric',
        attributes: {
          'metric.name': name,
          'metric.value': String(value),
          ...attributes,
        },
      });
    }
  }

  /**
   * Capture a generic event (legacy method, uses queue if no telemetry manager)
   */
  captureEvent(event: Omit<TelemetryEvent, 'sessionId' | 'timestamp'>) {
    if (this.telemetry) {
      // Use telemetry manager directly
      this.telemetry.captureEvent({
        name: event.name,
        attributes: event.attributes,
      });
    } else {
      // Fallback to queue
      const e: TelemetryEvent = {
        ...event,
        sessionId: this.getSessionId(),
        timestamp: Date.now(),
      };
      this.queue.push(e);
      if (this.queue.length >= this.maxQueueSize) {
        this.flushQueue();
      }
    }
  }

  /**
   * Start a span (delegates to telemetry manager)
   */
  startSpan(name: string, attributes?: Record<string, unknown>): Span {
    if (this.telemetry) {
      return this.telemetry.startSpan(name, attributes);
    }
    // Return a minimal no-op span if no telemetry manager
    return {
      setAttribute: () => {},
      setAttributes: () => {},
      addEvent: () => {},
      addLink: () => {},
      addLinks: () => {},
      setStatus: () => {},
      updateName: () => {},
      end: () => {},
      isRecording: () => false,
      recordException: () => {},
      spanContext: () => ({
        traceId: '00000000000000000000000000000000',
        spanId: '0000000000000000',
        traceFlags: 0,
      }),
    } as unknown as Span;
  }

  /**
   * End a span (delegates to telemetry manager)
   */
  endSpan(span: Span, success = true): void {
    if (this.telemetry) {
      this.telemetry.endSpan(span, success);
    } else {
      span.end();
    }
  }

  /**
   * Start periodic flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flushQueue();
    }, this.flushInterval);
  }

  /**
   * Stop flush timer (for cleanup)
   */
  stopFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
  }

  /**
   * Send events to collector/exporter
   */
  private async flushQueue(): Promise<void> {
    if (this.flushing || this.queue.length === 0) return;

    this.flushing = true;
    const eventsToSend = [...this.queue];
    this.queue = [];

    try {
      // TODO: send to Node SDK / OTLP collector / ClickHouse exporter
      // For MVP: console log
      if (eventsToSend.length > 0) {
        console.log('Telemetry flush:', eventsToSend);
      }
    } catch (error) {
      console.error('Failed to flush telemetry:', error);
      // Put back unsent events
      this.queue.unshift(...eventsToSend);
    } finally {
      this.flushing = false;
    }
  }
}

