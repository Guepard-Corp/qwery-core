/**
 * PostHog Telemetry Provider
 * 
 * Implements telemetry using PostHog for product analytics.
 */

import { ClientTelemetryService } from '../client.telemetry.service';
import type { TelemetryService } from '../types';

/**
 * Creates a PostHog telemetry provider
 */
export function createPostHogProvider(): () => TelemetryService {
  return () => new ClientTelemetryService();
}

