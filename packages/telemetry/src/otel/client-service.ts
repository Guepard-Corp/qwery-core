// packages/telemetry/src/otel/client-service.ts

import type { TelemetryManager as OtelTelemetryManager } from './types';
import type { Span } from '@opentelemetry/api';
import { createNoOpSpan } from './span-utils';

export class OtelClientService {
  private telemetry: OtelTelemetryManager | null = null;

  constructor(telemetry?: OtelTelemetryManager) {
    if (telemetry) {
      this.telemetry = telemetry;
    }
  }

  setTelemetryManager(telemetry: OtelTelemetryManager): void {
    this.telemetry = telemetry;
  }

  getSessionId(): string {
    return this.telemetry?.getSessionId() || 'client-session';
  }

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
    }
  }

  trackEvent(event: string, properties?: Record<string, unknown>): void {
    if (this.telemetry) {
      this.telemetry.captureEvent({
        name: event,
        attributes: properties,
      });
    }
  }

  trackMetric(
    name: string,
    value: number,
    attributes?: Record<string, string | number | boolean>,
  ): void {
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

  captureEvent(event: { name: string; attributes?: Record<string, unknown> }) {
    if (this.telemetry) {
      this.telemetry.captureEvent({
        name: event.name,
        attributes: event.attributes,
      });
    }
  }

  startSpan(name: string, attributes?: Record<string, unknown>): Span {
    if (this.telemetry) {
      return this.telemetry.startSpan(name, attributes);
    }
    return createNoOpSpan();
  }

  endSpan(span: Span, success = true): void {
    if (this.telemetry) {
      this.telemetry.endSpan(span, success);
    } else {
      span.end();
    }
  }
}
