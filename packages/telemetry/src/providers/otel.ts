import { type Counter, context, metrics, type Span, SpanStatusCode, trace } from '@opentelemetry/api';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import type { TelemetrySpan } from '@qwery/domain';
import { cleanAttributes, type TelemetryBackend } from '../backend';
import type { OtelConfig } from '../config';

const TRACER_NAME = 'qwery-telemetry';
const METER_NAME = 'qwery-telemetry';

function wrapSpan(span: Span): TelemetrySpan {
  return {
    setAttribute(key, value) {
      if (value !== undefined) span.setAttribute(key, value);
    },
    recordError(error) {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    },
    end(success = true) {
      span.setStatus({ code: success ? SpanStatusCode.OK : SpanStatusCode.ERROR });
      span.end();
    },
  };
}

/**
 * OpenTelemetry backend — distributed tracing + metrics, exported over OTLP/HTTP
 * (chosen over gRPC for Bun compatibility). Powers `startSpan` and
 * `recordTokenUsage`; analytics-style events are attached to the active span.
 */
export function createOtelBackend(otel: OtelConfig, serviceName: string): TelemetryBackend {
  const { endpoint, exportMetrics } = otel;

  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: serviceName,
  });

  const traceExporter = new OTLPTraceExporter({ url: `${endpoint.replace(/\/$/, '')}/v1/traces` });

  const metricReader = exportMetrics
    ? new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({ url: `${endpoint.replace(/\/$/, '')}/v1/metrics` }),
        exportIntervalMillis: 5000,
      })
    : undefined;

  const sdk = new NodeSDK({
    resource,
    traceExporter,
    metricReaders: metricReader ? [metricReader] : undefined,
  });
  sdk.start();

  const tracer = trace.getTracer(TRACER_NAME);
  const meter = metrics.getMeter(METER_NAME);

  let promptTokenCounter: Counter | undefined;
  let completionTokenCounter: Counter | undefined;
  if (exportMetrics) {
    promptTokenCounter = meter.createCounter('qwery.llm.prompt_tokens', {
      description: 'LLM prompt tokens consumed',
    });
    completionTokenCounter = meter.createCounter('qwery.llm.completion_tokens', {
      description: 'LLM completion tokens generated',
    });
  }

  return {
    name: 'otel',
    startSpan(name, attributes) {
      // No explicit context => parented to the active span (set by withSpan),
      // so tool spans started during a turn nest under the turn span.
      return wrapSpan(tracer.startSpan(name, { attributes: cleanAttributes(attributes) }));
    },
    async withSpan(name, attributes, fn) {
      const span = tracer.startSpan(name, { attributes: cleanAttributes(attributes) });
      const wrapped = wrapSpan(span);
      return await context.with(trace.setSpan(context.active(), span), async () => {
        try {
          const result = await fn(wrapped);
          wrapped.end(true);
          return result;
        } catch (error) {
          if (error instanceof Error) wrapped.recordError(error);
          wrapped.end(false);
          throw error;
        }
      });
    },
    trackEvent(name, properties) {
      const active = trace.getActiveSpan();
      if (active?.isRecording()) {
        active.addEvent(name, cleanAttributes(properties));
      }
    },
    trackError(error, properties) {
      // Span event only — error.name (generic) + safe context, never the message.
      const active = trace.getActiveSpan();
      if (active?.isRecording()) {
        active.addEvent('error', { ...cleanAttributes(properties), error_name: error.name });
      }
    },
    recordTokenUsage(usage) {
      const attrs = { model: usage.model, provider: usage.provider };
      promptTokenCounter?.add(usage.promptTokens, attrs);
      completionTokenCounter?.add(usage.completionTokens, attrs);
    },
    async shutdown() {
      await sdk.shutdown();
    },
  };
}
