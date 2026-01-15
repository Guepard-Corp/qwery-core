// packages/telemetry/src/otel/telemetry-utils.ts
import { getTelemetryConfig } from './config';

/**
 * Check if telemetry debug logging is enabled
 */
export function isDebugEnabled(): boolean {
  return getTelemetryConfig().debug;
}

/**
 * Generate a cryptographically secure random string in base36 format
 * Falls back to timestamp-based string if crypto API is unavailable
 */
export function secureRandomStringBase36(length: number): string {
  try {
    const webCrypto = globalThis.crypto;
    if (webCrypto && typeof webCrypto.getRandomValues === 'function') {
      const bytes = new Uint8Array(Math.max(8, Math.ceil(length * 0.75)));
      webCrypto.getRandomValues(bytes);
      return Array.from(bytes)
        .map((b) => b.toString(36))
        .join('')
        .slice(0, length);
    }
  } catch (error) {
    if (isDebugEnabled()) {
      console.warn(
        '[Telemetry] Failed to generate secure random string:',
        error,
      );
    }
  }

  // Fallback: timestamp-based (not cryptographically secure but won't hang)
  // This should only be used in extremely old environments
  const timestamp = Date.now().toString(36);
  const random = Math.floor(Math.random() * 1000000).toString(36);
  return `${timestamp}${random}`.slice(0, length);
}
