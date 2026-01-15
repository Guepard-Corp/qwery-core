// packages/telemetry/src/otel/metrics-manager.ts
import type { Meter, Counter, Histogram } from '@opentelemetry/api';
import type { TelemetryConfig } from './config';
import { isDebugEnabled } from './telemetry-utils';

export class MetricsManager {
  private commandDuration!: Histogram;
  private commandCount!: Counter;
  private commandErrorCount!: Counter;
  private commandSuccessCount!: Counter;
  private tokenPromptCount!: Counter;
  private tokenCompletionCount!: Counter;
  private tokenTotalCount!: Counter;
  private queryDuration!: Histogram;
  private queryCount!: Counter;
  private queryRowsReturned!: Histogram;
  // Agent metrics (for dashboard)
  private messageDuration!: Histogram;
  private tokensPrompt!: Counter;
  private tokensCompletion!: Counter;
  private tokensTotal!: Counter;

  constructor(
    private meter: Meter,
    private config: TelemetryConfig,
  ) {
    this.initializeMetrics();
  }

  private initializeMetrics(): void {
    // Command metrics
    this.commandDuration = this.meter.createHistogram('cli.command.duration', {
      description: 'Duration of CLI command execution in milliseconds',
      unit: 'ms',
    });

    this.commandCount = this.meter.createCounter('cli.command.count', {
      description: 'Total number of CLI commands executed',
    });

    this.commandErrorCount = this.meter.createCounter(
      'cli.command.error.count',
      {
        description: 'Number of CLI commands that failed',
      },
    );

    this.commandSuccessCount = this.meter.createCounter(
      'cli.command.success.count',
      {
        description: 'Number of CLI commands that succeeded',
      },
    );

    // Token usage metrics
    this.tokenPromptCount = this.meter.createCounter('cli.ai.tokens.prompt', {
      description: 'Total prompt tokens used',
    });

    this.tokenCompletionCount = this.meter.createCounter(
      'cli.ai.tokens.completion',
      {
        description: 'Total completion tokens used',
      },
    );

    this.tokenTotalCount = this.meter.createCounter('cli.ai.tokens.total', {
      description: 'Total tokens used (prompt + completion)',
    });

    // Query metrics
    this.queryDuration = this.meter.createHistogram('cli.query.duration', {
      description: 'Duration of query execution in milliseconds',
      unit: 'ms',
    });

    this.queryCount = this.meter.createCounter('cli.query.count', {
      description: 'Total number of queries executed',
    });

    this.queryRowsReturned = this.meter.createHistogram(
      'cli.query.rows.returned',
      {
        description: 'Number of rows returned by queries',
      },
    );

    // Agent message metrics (for dashboard)
    this.messageDuration = this.meter.createHistogram(
      'agent.message.duration_ms',
      {
        description: 'Duration of agent message processing in milliseconds',
        unit: 'ms',
      },
    );

    // LLM token metrics (matching dashboard queries)
    this.tokensPrompt = this.meter.createCounter('ai.tokens.prompt', {
      description: 'Total prompt tokens consumed',
      unit: 'tokens',
    });

    this.tokensCompletion = this.meter.createCounter('ai.tokens.completion', {
      description: 'Total completion tokens generated',
      unit: 'tokens',
    });

    this.tokensTotal = this.meter.createCounter('ai.tokens.total', {
      description: 'Total tokens (prompt + completion)',
      unit: 'tokens',
    });
  }

  // Metrics recording methods
  recordCommandDuration(
    durationMs: number,
    attributes?: Record<string, string | number | boolean>,
  ): void {
    if (!this.config.enabled) {
      return;
    }
    this.commandDuration.record(durationMs, attributes);
  }

  recordCommandCount(
    attributes?: Record<string, string | number | boolean>,
  ): void {
    if (!this.config.enabled) {
      return;
    }
    this.commandCount.add(1, attributes);
  }

  recordCommandError(
    attributes?: Record<string, string | number | boolean>,
  ): void {
    if (!this.config.enabled) {
      return;
    }
    this.commandErrorCount.add(1, attributes);
  }

  recordCommandSuccess(
    attributes?: Record<string, string | number | boolean>,
  ): void {
    if (!this.config.enabled) {
      return;
    }
    this.commandSuccessCount.add(1, attributes);
  }

  recordTokenUsage(
    promptTokens: number,
    completionTokens: number,
    attributes?: Record<string, string | number | boolean>,
  ): void {
    if (!this.config.enabled) {
      return;
    }
    if (isDebugEnabled()) {
      console.log('[Telemetry] Recording token usage:', {
        promptTokens,
        completionTokens,
        total: promptTokens + completionTokens,
        attributes,
        timestamp: new Date().toISOString(),
      });
    }
    this.tokenPromptCount.add(promptTokens, attributes);
    this.tokenCompletionCount.add(completionTokens, attributes);
    this.tokenTotalCount.add(promptTokens + completionTokens, attributes);
  }

  recordQueryDuration(
    durationMs: number,
    attributes?: Record<string, string | number | boolean>,
  ): void {
    if (!this.config.enabled) {
      return;
    }
    if (isDebugEnabled()) {
      console.log('[Telemetry] Recording query duration:', {
        durationMs,
        attributes,
        timestamp: new Date().toISOString(),
      });
    }
    this.queryDuration.record(durationMs, attributes);
  }

  recordQueryCount(
    attributes?: Record<string, string | number | boolean>,
  ): void {
    if (!this.config.enabled) {
      return;
    }
    if (isDebugEnabled()) {
      console.log('[Telemetry] Recording query count:', {
        attributes,
        timestamp: new Date().toISOString(),
      });
    }
    this.queryCount.add(1, attributes);
  }

  recordQueryRowsReturned(
    rowCount: number,
    attributes?: Record<string, string | number | boolean>,
  ): void {
    if (!this.config.enabled) {
      return;
    }
    if (isDebugEnabled()) {
      console.log('[Telemetry] Recording query rows returned:', {
        rowCount,
        attributes,
        timestamp: new Date().toISOString(),
      });
    }
    this.queryRowsReturned.record(rowCount, attributes);
  }

  // Agent metrics recording methods
  recordMessageDuration(
    durationMs: number,
    attributes?: Record<string, string | number | boolean>,
  ): void {
    if (!this.config.enabled) {
      return;
    }
    this.messageDuration.record(durationMs, attributes);
  }

  recordAgentTokenUsage(
    promptTokens: number,
    completionTokens: number,
    attributes?: Record<string, string | number | boolean>,
  ): void {
    if (!this.config.enabled) {
      return;
    }
    if (isDebugEnabled()) {
      console.log('[Telemetry] Recording agent token usage:', {
        promptTokens,
        completionTokens,
        total: promptTokens + completionTokens,
        attributes,
        timestamp: new Date().toISOString(),
      });
    }
    // Validate token values before recording (prevent negative or invalid values)
    if (promptTokens < 0 || completionTokens < 0) {
      if (isDebugEnabled()) {
        console.warn('[Telemetry] Invalid token values detected:', {
          promptTokens,
          completionTokens,
          attributes,
        });
      }
      return;
    }
    this.tokensPrompt.add(promptTokens, attributes);
    this.tokensCompletion.add(completionTokens, attributes);
    this.tokensTotal.add(promptTokens + completionTokens, attributes);
  }

  // Expose tokenTotalCount for test metric recording in init()
  getTokenTotalCount(): Counter {
    return this.tokenTotalCount;
  }
}
