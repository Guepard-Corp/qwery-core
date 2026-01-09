// packages/telemetry/src/otel/filtering-exporter.ts
import type { SpanExporter, ReadableSpan } from '@opentelemetry/sdk-trace-base';

/**
 * Patterns that match general spans (agents, actors, LLM) that should always be exported
 */
const GENERAL_SPAN_PATTERNS = [
  /^agent\./, // Matches agent.conversation, agent.message, etc.
  /^agent\.actor\./, // All actor spans
  /^agent\.llm\./, // LLM-related spans
];

/**
 * Patterns that match app-specific spans (cli, web, desktop) that are conditionally exported
 */
const APP_SPAN_PATTERNS = [
  /^cli\./, // CLI-specific spans
  /^web\./, // Web-specific spans
  /^desktop\./, // Desktop-specific spans
];

/**
 * Checks if a span name matches any of the general patterns
 */
function isGeneralSpan(spanName: string): boolean {
  return GENERAL_SPAN_PATTERNS.some((pattern) => pattern.test(spanName));
}

/**
 * Checks if a span name matches any of the app-specific patterns
 */
function isAppSpan(spanName: string): boolean {
  return APP_SPAN_PATTERNS.some((pattern) => pattern.test(spanName));
}

/**
 * Configuration options for FilteringSpanExporter
 */
export interface FilteringSpanExporterOptions {
  /**
   * The underlying exporter to use for exporting spans
   */
  exporter: SpanExporter;
  /**
   * Whether to export app-specific telemetry (cli, web, desktop spans)
   * Default: true (for backward compatibility)
   */
  exportAppTelemetry?: boolean;
}

/**
 * A span exporter that filters spans based on their names.
 *
 * - General spans (agent.*, agent.actor.*, agent.llm.*) are always exported
 * - App-specific spans (cli.*, web.*, desktop.*) are exported only if exportAppTelemetry is true
 * - Other spans are exported (for backward compatibility)
 */
export class FilteringSpanExporter implements SpanExporter {
  private exporter: SpanExporter;
  private exportAppTelemetry: boolean;

  constructor(options: FilteringSpanExporterOptions) {
    this.exporter = options.exporter;
    this.exportAppTelemetry = options.exportAppTelemetry ?? true;
  }

  export(
    spans: ReadableSpan[],
    resultCallback: (result: { code: number; error?: Error }) => void,
  ): void {
    // Filter spans based on their names
    const filteredSpans = spans.filter((span) => {
      const spanName = span.name;

      // Always export general spans (agents, actors, LLM)
      if (isGeneralSpan(spanName)) {
        return true;
      }

      // Conditionally export app-specific spans
      if (isAppSpan(spanName)) {
        return this.exportAppTelemetry;
      }

      // Export other spans for backward compatibility
      return true;
    });

    // If no spans to export, call callback with success
    if (filteredSpans.length === 0) {
      resultCallback({ code: 0 });
      return;
    }

    // Export filtered spans
    this.exporter.export(filteredSpans, resultCallback);
  }

  shutdown(): Promise<void> {
    return this.exporter.shutdown();
  }
}

