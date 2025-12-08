/**
 * Null Telemetry Service
 * 
 * No-op implementation of telemetry service for testing or opt-out scenarios.
 * All methods exist but perform no operations.
 */

import type { Span } from '@opentelemetry/api';
import type { TelemetryManager } from './telemetry-manager';

export class NullTelemetryService {
  private sessionId: string = 'null-session';

  /**
   * Get session ID (returns a dummy value)
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Initialize (no-op)
   */
  async init(): Promise<void> {
    // No-op
  }

  /**
   * Shutdown (no-op)
   */
  async shutdown(): Promise<void> {
    // No-op
  }

  /**
   * Start span (returns a no-op span)
   */
  startSpan(_name: string, _attributes?: Record<string, any>): Span {
    // Return a minimal span-like object that does nothing
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
   * End span (no-op)
   */
  endSpan(_span: Span, _success: boolean): void {
    // No-op
  }

  /**
   * Capture event (no-op)
   */
  captureEvent(_options: {
    name: string;
    attributes?: Record<string, any>;
  }): void {
    // No-op
  }

  /**
   * Record command duration (no-op)
   */
  recordCommandDuration(_durationMs: number, _attributes?: Record<string, string | number | boolean>): void {
    // No-op
  }

  /**
   * Record command count (no-op)
   */
  recordCommandCount(_attributes?: Record<string, string | number | boolean>): void {
    // No-op
  }

  /**
   * Record command error (no-op)
   */
  recordCommandError(_attributes?: Record<string, string | number | boolean>): void {
    // No-op
  }

  /**
   * Record command success (no-op)
   */
  recordCommandSuccess(_attributes?: Record<string, string | number | boolean>): void {
    // No-op
  }

  /**
   * Record token usage (no-op)
   */
  recordTokenUsage(
    _promptTokens: number,
    _completionTokens: number,
    _attributes?: Record<string, string | number | boolean>,
  ): void {
    // No-op
  }

  /**
   * Record query duration (no-op)
   */
  recordQueryDuration(_durationMs: number, _attributes?: Record<string, string | number | boolean>): void {
    // No-op
  }

  /**
   * Record query count (no-op)
   */
  recordQueryCount(_attributes?: Record<string, string | number | boolean>): void {
    // No-op
  }

  /**
   * Record query rows returned (no-op)
   */
  recordQueryRowsReturned(_rowCount: number, _attributes?: Record<string, string | number | boolean>): void {
    // No-op
  }

  /**
   * Client service (no-op implementation)
   */
  clientService = {
    captureEvent: () => {},
    startSpan: () => this.startSpan(''),
    endSpan: () => {},
  };
}

/**
 * Create a null telemetry service instance
 */
export function createNullTelemetryService(): NullTelemetryService {
  return new NullTelemetryService();
}

