// packages/telemetry/src/otel/span-utils.ts
import type { Span } from '@opentelemetry/api';

/**
 * Serializes attribute values to OpenTelemetry-compatible primitives.
 * Objects and arrays are converted to JSON strings.
 */
export function serializeAttributes(
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

/**
 * Creates a no-op span that can be used when telemetry is disabled.
 * All methods are no-ops that do nothing.
 */
export function createNoOpSpan(): Span {
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
