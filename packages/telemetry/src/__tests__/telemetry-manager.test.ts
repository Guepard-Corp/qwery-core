import { describe, expect, test } from 'bun:test';
import { NULL_TELEMETRY_SPAN, type TelemetrySpan } from '@qwery/domain';
import type { TelemetryBackend } from '../backend';
import type { ResolvedTelemetryConfig } from '../config';
import { createTelemetryManager } from '../telemetry-manager';

const baseConfig: ResolvedTelemetryConfig = {
  enabled: true,
  debug: false,
  serviceName: 'test',
  distinctId: 'anon',
};

function recordingBackend(name: string) {
  const events: Array<{ name: string; props?: Record<string, unknown> }> = [];
  const backend: TelemetryBackend = {
    name,
    trackEvent: (eventName, props) => events.push({ name: eventName, props }),
  };
  return { backend, events };
}

describe('createTelemetryManager', () => {
  test('fans trackEvent out to every backend', () => {
    const a = recordingBackend('a');
    const b = recordingBackend('b');
    const telemetry = createTelemetryManager([a.backend, b.backend], baseConfig);

    telemetry.trackEvent('session.started', { foo: 'bar' });

    expect(a.events).toEqual([{ name: 'session.started', props: { foo: 'bar' } }]);
    expect(b.events).toEqual([{ name: 'session.started', props: { foo: 'bar' } }]);
  });

  test('isolates a throwing backend so others still receive the event', () => {
    const throwing: TelemetryBackend = {
      name: 'boom',
      trackEvent: () => {
        throw new Error('backend down');
      },
    };
    const healthy = recordingBackend('ok');
    const telemetry = createTelemetryManager([throwing, healthy.backend], baseConfig);

    expect(() => telemetry.trackEvent('e')).not.toThrow();
    expect(healthy.events).toHaveLength(1);
  });

  test('startSpan returns the first real span, else the null span', () => {
    const span: TelemetrySpan = { setAttribute: () => {}, recordError: () => {}, end: () => {} };
    const tracing: TelemetryBackend = { name: 'otel', startSpan: () => span };
    const analytics = recordingBackend('posthog');

    const withTracing = createTelemetryManager([analytics.backend, tracing], baseConfig);
    expect(withTracing.startSpan('s')).toBe(span);

    const withoutTracing = createTelemetryManager([analytics.backend], baseConfig);
    expect(withoutTracing.startSpan('s')).toBe(NULL_TELEMETRY_SPAN);
  });

  test('withSpan ends the span on success and rethrows + ends on error', async () => {
    let ended: boolean | undefined;
    let recordedError = false;
    const span: TelemetrySpan = {
      setAttribute: () => {},
      recordError: () => {
        recordedError = true;
      },
      end: (success) => {
        ended = success;
      },
    };
    const tracing: TelemetryBackend = { name: 'otel', startSpan: () => span };
    const telemetry = createTelemetryManager([tracing], baseConfig);

    const value = await telemetry.withSpan('ok', {}, async () => 42);
    expect(value).toBe(42);
    expect(ended).toBe(true);

    await expect(
      telemetry.withSpan('fail', {}, async () => {
        throw new Error('nope');
      }),
    ).rejects.toThrow('nope');
    expect(recordedError).toBe(true);
    expect(ended).toBe(false);
  });

  test('flush and shutdown await every backend without throwing', async () => {
    let flushed = false;
    let shutDown = false;
    const backend: TelemetryBackend = {
      name: 'x',
      flush: async () => {
        flushed = true;
      },
      shutdown: async () => {
        shutDown = true;
      },
    };
    const telemetry = createTelemetryManager([backend], baseConfig);

    await telemetry.flush();
    await telemetry.shutdown();

    expect(flushed).toBe(true);
    expect(shutDown).toBe(true);
  });
});
