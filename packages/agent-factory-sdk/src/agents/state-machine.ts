import { setup, assign } from 'xstate';
import { fromPromise } from 'xstate/actors';
import type { UIMessage } from 'ai';
import { AgentContext, AgentEvents } from './types';
import { detectIntent } from './actors/detect-intent.actor';
import { summarizeIntent } from './actors/summarize-intent.actor';
import { greeting } from './actors/greeting.actor';
import { readDataAgent } from './actors/read-data-agent.actor';
import { loadContext } from './actors/load-context.actor';
import { systemInfoActor } from './actors';
import { MessagePersistenceService } from '../services/message-persistence.service';
import { Repositories } from '@qwery/domain/repositories';
import { createCachedActor } from './utils/actor-cache';
import { AbstractQueryEngine } from '@qwery/domain/ports';
import type { PromptSource } from '../domain';
import type { TelemetryManager } from '@qwery/telemetry/otel';
import {
  createActorAttributes,
  endActorSpanWithEvent,
} from '@qwery/telemetry/otel';
import { AGENT_EVENTS } from '@qwery/telemetry';
import {
  context as otelContext,
  trace,
  type SpanContext,
} from '@opentelemetry/api';
import { getLogger } from '@qwery/shared/logger';

export const createStateMachine = (
  conversationId: string,
  conversationSlug: string,
  model: string,
  repositories: Repositories,
  queryEngine: AbstractQueryEngine,
  telemetry: TelemetryManager,
  getParentSpanContexts?: () =>
    | Array<{
        context: SpanContext;
        attributes?: Record<string, string | number | boolean>;
      }>
    | undefined,
  storeLoadContextSpan?: (
    span: ReturnType<TelemetryManager['startSpan']>,
  ) => void,
) => {
  // Helper to safely extract token usage from usage objects
  // Different providers use different property names
  const extractTokenUsage = (
    usage: unknown,
  ): {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  } => {
    if (!usage || typeof usage !== 'object') {
      return { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    }

    const usageObj = usage as Record<string, unknown>;
    const promptTokens =
      (typeof usageObj.inputTokens === 'number' ? usageObj.inputTokens : 0) ||
      (typeof usageObj.inputTokens === 'number' ? usageObj.inputTokens : 0) ||
      (typeof usageObj.prompt_tokens === 'number'
        ? usageObj.prompt_tokens
        : 0) ||
      0;

    const completionTokens =
      (typeof usageObj.outputTokens === 'number' ? usageObj.outputTokens : 0) ||
      (typeof usageObj.outputTokens === 'number' ? usageObj.outputTokens : 0) ||
      (typeof usageObj.completion_tokens === 'number'
        ? usageObj.completion_tokens
        : 0) ||
      0;

    const totalTokens =
      (typeof usageObj.totalTokens === 'number' ? usageObj.totalTokens : 0) ||
      (typeof usageObj.total_tokens === 'number' ? usageObj.total_tokens : 0) ||
      promptTokens + completionTokens;

    return { promptTokens, completionTokens, totalTokens };
  };

  // Helper to parse model string and extract provider/model name
  // Handles formats like "azure/gpt-5-mini" or just "gpt-5-mini"
  const parseModel = (
    model: string,
  ): {
    provider: string;
    modelName: string;
    fullModel: string;
  } => {
    const parts = model.split('/');
    if (parts.length === 2) {
      return {
        provider: parts[0]!,
        modelName: parts[1]!,
        fullModel: model,
      };
    }
    // Default provider to 'azure' if not specified (for backward compatibility)
    return {
      provider: 'azure',
      modelName: model,
      fullModel: model,
    };
  };

  // Create telemetry-wrapped actors
  // All actors use startSpan for consistent nesting behavior
  // OpenTelemetry's AsyncLocalStorage should preserve context across async boundaries
  // Context is set when sending USER_INPUT, allowing actors to access parent spans
  const detectIntentActor = fromPromise(
    async ({
      input,
    }: {
      input: {
        inputMessage: string;
        model: string;
      };
    }): Promise<AgentContext['intent']> => {
      const startTime = Date.now();
      const {
        provider: _provider,
        modelName: _modelName,
        fullModel: _fullModel,
      } = parseModel(input.model);

      // Create span with actor attributes
      const span = telemetry.startSpan(
        'agent.actor.detectIntent',
        createActorAttributes(
          'detectIntent',
          'detectIntent',
          conversationId,
          input.model,
          { inputMessage: input.inputMessage },
        ),
      );

      telemetry.captureEvent({
        name: AGENT_EVENTS.ACTOR_INVOKED,
        attributes: {
          'agent.actor.id': 'detectIntent',
          'agent.actor.type': 'detectIntent',
          'agent.conversation.id': conversationId,
        },
      });

      // Run within the span's context to ensure proper nesting
      return otelContext.with(
        trace.setSpan(otelContext.active(), span),
        async () => {
          try {
            const { result } = await detectIntent(
              input.inputMessage,
              undefined,
            );

            endActorSpanWithEvent(
              telemetry,
              span,
              'detectIntent',
              'detectIntent',
              conversationId,
              startTime,
              true,
            );

            return result;
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            const errorType =
              error instanceof Error ? error.name : 'UnknownError';

            endActorSpanWithEvent(
              telemetry,
              span,
              'detectIntent',
              'detectIntent',
              conversationId,
              startTime,
              false,
              errorMessage,
              errorType,
            );

            throw error;
          }
        },
      );
    },
  );

  const summarizeIntentActor = fromPromise(
    async ({
      input,
    }: {
      input: {
        inputMessage: string;
        intent: AgentContext['intent'];
        previousMessages: UIMessage[];
        model: string;
      };
    }) => {
      const startTime = Date.now();
      const {
        provider,
        modelName,
        fullModel: _fullModel,
      } = parseModel(input.model);

      // Create span with actor attributes
      const span = telemetry.startSpan(
        'agent.actor.summarizeIntent',
        createActorAttributes(
          'summarizeIntent',
          'summarizeIntent',
          conversationId,
          input.model,
        ),
      );

      telemetry.captureEvent({
        name: AGENT_EVENTS.ACTOR_INVOKED,
        attributes: {
          'agent.actor.id': 'summarizeIntent',
          'agent.actor.type': 'summarizeIntent',
          'agent.conversation.id': conversationId,
        },
      });

      // Run within the span's context to ensure proper nesting
      return otelContext.with(
        trace.setSpan(otelContext.active(), span),
        async () => {
          try {
            const result = await summarizeIntent(
              input.inputMessage,
              input.intent,
            );

            // Capture token usage from streamText result (usage is a promise)
            // For Azure/Ollama providers, usage will be available when stream completes
            if (result.usage) {
              try {
                const usage = await result.usage;
                if (usage) {
                  // Azure uses inputTokens/outputTokens, others use promptTokens/completionTokens
                  const { promptTokens, completionTokens, totalTokens } =
                    extractTokenUsage(usage);

                  if (promptTokens > 0 || completionTokens > 0) {
                    // Add token usage as span attributes so it appears in exported data
                    span.setAttributes({
                      'agent.llm.prompt.tokens': promptTokens,
                      'agent.llm.completion.tokens': completionTokens,
                      'agent.llm.total.tokens': totalTokens,
                    });

                    // Also record as metrics (using agent-specific method for dashboard)
                    telemetry.recordAgentTokenUsage(
                      promptTokens,
                      completionTokens,
                      {
                        'agent.llm.model.name': modelName,
                        'agent.llm.provider.id': provider,
                        'agent.actor.id': 'summarizeIntent',
                        'agent.conversation.id': conversationId,
                      },
                    );
                  }
                }
              } catch {
                // Ignore errors in usage capture
              }
            }

            endActorSpanWithEvent(
              telemetry,
              span,
              'summarizeIntent',
              'summarizeIntent',
              conversationId,
              startTime,
              true,
            );

            return result;
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            const errorType =
              error instanceof Error ? error.name : 'UnknownError';

            endActorSpanWithEvent(
              telemetry,
              span,
              'summarizeIntent',
              'summarizeIntent',
              conversationId,
              startTime,
              false,
              errorMessage,
              errorType,
            );

            throw error;
          }
        },
      );
    },
  );

  const greetingActor = fromPromise(
    async ({
      input,
    }: {
      input: {
        inputMessage: string;
        model: string;
      };
    }) => {
      const startTime = Date.now();
      const {
        provider,
        modelName,
        fullModel: _fullModel,
      } = parseModel(input.model);

      // Create span with actor attributes
      const span = telemetry.startSpan(
        'agent.actor.greeting',
        createActorAttributes(
          'greeting',
          'greeting',
          conversationId,
          input.model,
        ),
      );

      telemetry.captureEvent({
        name: AGENT_EVENTS.ACTOR_INVOKED,
        attributes: {
          'agent.actor.id': 'greeting',
          'agent.actor.type': 'greeting',
          'agent.conversation.id': conversationId,
        },
      });

      // Run within the span's context to ensure proper nesting
      return otelContext.with(
        trace.setSpan(otelContext.active(), span),
        async () => {
          try {
            const result = await greeting(input.inputMessage, input.model);

            // Capture token usage from streamText result (usage is a promise)
            // For Azure/Ollama providers, usage will be available when stream completes
            if (result.usage) {
              try {
                const usage = await result.usage;
                if (usage) {
                  // Azure uses inputTokens/outputTokens, others use promptTokens/completionTokens
                  const { promptTokens, completionTokens, totalTokens } =
                    extractTokenUsage(usage);

                  if (promptTokens > 0 || completionTokens > 0) {
                    // Add token usage as span attributes so it appears in exported data
                    span.setAttributes({
                      'agent.llm.prompt.tokens': promptTokens,
                      'agent.llm.completion.tokens': completionTokens,
                      'agent.llm.total.tokens': totalTokens,
                    });

                    // Also record as metrics (using agent-specific method for dashboard)
                    telemetry.recordAgentTokenUsage(
                      promptTokens,
                      completionTokens,
                      {
                        'agent.llm.model.name': modelName,
                        'agent.llm.provider.id': provider,
                        'agent.actor.id': 'greeting',
                        'agent.conversation.id': conversationId,
                      },
                    );
                  }
                }
              } catch {
                // Ignore errors in usage capture
              }
            }

            endActorSpanWithEvent(
              telemetry,
              span,
              'greeting',
              'greeting',
              conversationId,
              startTime,
              true,
            );

            return result;
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            const errorType =
              error instanceof Error ? error.name : 'UnknownError';

            endActorSpanWithEvent(
              telemetry,
              span,
              'greeting',
              'greeting',
              conversationId,
              startTime,
              false,
              errorMessage,
              errorType,
            );

            throw error;
          }
        },
      );
    },
  );

  const readDataAgentActor = fromPromise(
    async ({
      input,
    }: {
      input: {
        inputMessage: string;
        conversationId: string;
        previousMessages: UIMessage[];
        model: string;
        repositories: Repositories;
        queryEngine: AbstractQueryEngine;
      };
    }) => {
      const startTime = Date.now();
      const {
        provider,
        modelName,
        fullModel: _fullModel,
      } = parseModel(input.model);

      // Create span with actor attributes
      const span = telemetry.startSpan(
        'agent.actor.readData',
        createActorAttributes(
          'readData',
          'readData',
          conversationId,
          input.model,
        ),
      );

      telemetry.captureEvent({
        name: AGENT_EVENTS.ACTOR_INVOKED,
        attributes: {
          'agent.actor.id': 'readData',
          'agent.actor.type': 'readData',
          'agent.conversation.id': conversationId,
        },
      });

      const parentContext = otelContext.active();
      const activeSpan = trace.getSpan(parentContext);
      if (activeSpan) {
        span.addLink({
          context: activeSpan.spanContext(),
        });
      }

      try {
        const result = await readDataAgent(
          input.conversationId,
          input.previousMessages,
          input.model,
          input.queryEngine,
          input.repositories,
        );

        if (result.usage) {
          void Promise.resolve(result.usage)
            .then((usage) => {
              if (usage) {
                const { promptTokens, completionTokens, totalTokens } =
                  extractTokenUsage(usage);

                if (promptTokens > 0 || completionTokens > 0) {
                  span.setAttributes({
                    'agent.llm.prompt.tokens': promptTokens,
                    'agent.llm.completion.tokens': completionTokens,
                    'agent.llm.total.tokens': totalTokens,
                  });

                  telemetry.recordAgentTokenUsage(
                    promptTokens,
                    completionTokens,
                    {
                      'agent.llm.model.name': modelName,
                      'agent.llm.provider.id': provider,
                      'agent.actor.id': 'readData',
                      'agent.conversation.id': conversationId,
                    },
                  );
                }
              }
            })
            .catch(() => {
              // Ignore errors in usage capture
            });
        }

        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const errorType = error instanceof Error ? error.name : 'UnknownError';

        endActorSpanWithEvent(
          telemetry,
          span,
          'readData',
          'readData',
          conversationId,
          startTime,
          false,
          errorMessage,
          errorType,
        );

        throw error;
      }
    },
  );

  const loadContextActor = fromPromise(
    async ({
      input,
    }: {
      input: {
        repositories: Repositories;
        conversationId: string;
      };
    }) => {
      const startTime = Date.now();

      // Create span with actor attributes (no model for loadContext)
      const span = telemetry.startSpan(
        'agent.actor.loadContext',
        createActorAttributes(
          'loadContext',
          'loadContext',
          conversationId,
          undefined, // No model for loadContext
        ),
      );

      if (storeLoadContextSpan) {
        storeLoadContextSpan(span);
      }

      telemetry.captureEvent({
        name: AGENT_EVENTS.ACTOR_INVOKED,
        attributes: {
          'agent.actor.id': 'loadContext',
          'agent.actor.type': 'loadContext',
          'agent.conversation.id': conversationId,
        },
      });

      // Run within the span's context to ensure proper nesting
      return otelContext.with(
        trace.setSpan(otelContext.active(), span),
        async () => {
          try {
            const result = await loadContext(
              input.repositories,
              input.conversationId,
            );
            const messages =
              MessagePersistenceService.convertToUIMessages(result);

            span.setAttributes({
              'agent.context.message_count': messages.length,
            });

            endActorSpanWithEvent(
              telemetry,
              span,
              'loadContext',
              'loadContext',
              conversationId,
              startTime,
              true,
            );

            return messages;
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            const errorType =
              error instanceof Error ? error.name : 'UnknownError';

            endActorSpanWithEvent(
              telemetry,
              span,
              'loadContext',
              'loadContext',
              conversationId,
              startTime,
              false,
              errorMessage,
              errorType,
            );

            throw error;
          }
        },
      );
    },
  );

  const defaultSetup = setup({
    types: {
      context: {} as AgentContext,
      events: {} as AgentEvents,
    },
    actors: {
      detectIntentActor,
      detectIntentActorCached: createCachedActor(
        detectIntentActor,
        (input: { inputMessage: string; model: string }) => {
          return `${input.inputMessage}::${input.model}`;
        },
        30000,
      ),
      summarizeIntentActor,
      greetingActor,
      readDataAgentActor,
      loadContextActor,
      systemInfoActor,
    },
    guards: {
      //eslint-disable-next-line @typescript-eslint/no-explicit-any
      isGreeting: ({ event }: { event: any }) =>
        event.output?.intent === 'greeting',

      isOther: ({ event }) => event.output?.intent === 'other',

      isReadData: ({ event }) => event.output?.intent === 'read-data',

      isSystem: ({ event }) => event.output?.intent === 'system',

      shouldRetry: ({ context }) => {
        const retryCount = context.retryCount || 0;
        return retryCount < 3;
      },

      retryLimitExceeded: ({ context }) => {
        const retryCount = context.retryCount || 0;
        return retryCount >= 3;
      },
    },
    delays: {
      retryDelay: ({ context }) => {
        const retryCount = context.retryCount || 0;
        return Math.pow(2, retryCount) * 1000;
      },
    },
  });
  return defaultSetup.createMachine({
    /** @xstate-layout N4IgpgJg5mDOIC5QDMCGBjALgewE4E8BaVGAO0wDoAbbVCAYW3LAA9MBiCJsCgS1IBu2ANY8AMgHkAggBEA+vQkA5ACoBRABoqA2gAYAuolAAHbLF6ZeTIyBaIALLoCsFABwAmXQGYnTgJxeAOwAjK5O9gA0IPiI7sHBFE66ycEhwfbBAGyZPgC+uVFoWHhEJGDk1LQMTJisHGC4uHgUxlSomMh4ALYUkrIKyupaeoZIIKbmltZjdgjugbqZFMFOOT6BgZlO7q5RMQhezhS6ga6pYeHumX7BXvmFGDgExGSUvBBUYOwAqgDKagAlOQASSUAAVvjoDDYJhYrKQbLNtntEGdEslnE4vMF3Dd3O57iAik9Sq8+B8vr8VBIwSMYWY4dNQLMvJ5dBR7JlgiceVitoEUQgcV4KAE-LpXK4NhsvK5dH5CcSSi9ypRcABXUikfhQH7-IGgiFQ0YmBlTBEzRA4vyBNx+Vz2aXxbGbQWsvwUU7i2XeG5ZPIFImPZVlCoarU69hUml0saw82I2ILJYrNZODZbHaC25OBKBdPuLz2TyFi6K4PPUNqzXa0hQCgQMC1LDA5gVdq1LrGSx1zjcPiCEQ8ADiahUINUalUsdNk3hiaFunsHpxSVT7nsq3skWiiBCK9SpeumVO4XLxUrZPDtfrjebmFbtXbmE73cjXFIPH4QlEFFH49BdRp2CE1xjNedLUXZdlncNdVg3Lcd32B17AoLxMk8YIAjOWCbnPEkVTDGsdQbJswBbNtKA7MAux7XUPy-Qdf3-CcgJ0dxQPjCDmStJcV1g3R103TJt2zXF3E9TIzj8TJ5VzHx7HwkMr2IutSPvR9VQoajaPfftvyHP8x1YqcdC8TjwKZWxeK8fi4Iw4TRN3BBZNQ+IQi5Vwiy82ClMvLTrxIu9yIfSjtJfGi317BomlwFo2g6bojIAydp2hONLItHiEHTD1HX5exsRdHJs3SD1AnE3FixE2C7kDJV-KIiM1OCiinyoiLdOixpmladpOlwHoWMA0ztBA+k5ys2Z5iuZZVi8dZNm2XZnLKlwvKxTk-Fg+JBL80kAtU28yLarSdKi3UWFgTB2h4VBkFqXAAApDgxABKdgGoOpqb3UkLNOfV86JnMDJqy6ycsCPKlsCQrblSErVucFNc0WKHXByfEnH2wjq2a46NLC3AmwISMrpu2ptIehonuJzACBkMA2nwD6vtxihApak7QvajmSfwHUQa4qa9wyChcSkmSlzk+wVv2bkJQoLZdsEwTsWcHGqw5o6KFgdUui6VBcF4AAvMAAY4BiBx-Hhfm+ABZe2pABYEAC01BMtKLLBhdUmxJWQklCqkmcK5BUCdDEgW8U-AydJnGCTWVPx3X9cN42zYt9gYt6hKBp6O3Hedt2PZGr2JsZcHpoqlG0wzZbBW3WvDlOKHZWqpPDpTqBiabPTP2twzfikMRvjUIXMoXQsRKVvwsXzVZZKXwUvPZeJPAWMIVhOVxO5+kie7APvuti+L+qS4fR-H9LZ0rqePLmuulqzVbHAk2DA-CMJkkCPe8d+4mdAZDtFQH2Ae11boUDZlrTm9ZAEQGATdCePtILT1QtceevhsiLEWNmbE60TjiSlFcM4f9tYp3gYg1ALQmjoDgLAAEYAACO6o4BvCYv3RiNsKAAjUP0GQUgVBSGQXfSCoRcSik2A5CUrIKpy14lKDkyRY4nlzDJXe9UKzfX-iRShICaHYDobABhzDWHXUHsISMOc4p9USoNHhfD5ACKESIhMYiPAehtNkDcMiZryKFBkFwOQsT2jnnIryZDYF8yAfo4wtD6GMJYWwixVieo2LzklXh-DBHCPGhlFB2VxGeKkT4nycixKw0SAWY8rI-Z1QeBebR5CAFgBiTdAxRiTFJPMQZSxvZyaQPuo9J6OIMS6FZlo9mUS9HtLiYYhJpjkm9MFjfUGojCkeMkd4xwZSX7y1COyG0NwJRYQ3icSJOsZnULmZ0xJZi1T8zJhAymQyaZ0wZkzVALNPqTJgZc1pCDYnxOMXc5J7yBZ1lcdxCGWEMYcjiAEbcCwiy4jwVJZYCl1YVXmDkC5KdYD4GujRVsnQwFcKHgATSpGoe2E4ABiEgoUiyFBHBIJ5QjEJDtsTIgpPJoXZV5Rw+ZDgaIaQRP5+LCWdhJdgbOaSz52ILlS9QtLQQMqZVXJMWRH4LXTM-fxPgJLpjOJyQq20cJ4t+tdQBXRIx0tBMCX4AAJOQVIsn2w1ffRYOrFqZn8bcQS4sCweKwpsIs+RAykGwI2eAYxoGvArm47KhABTOUIJkMhNA6CMGYGwRN0KkTuEFPiVCOw8QygRg6AkmjGns3eJ8fNzLsTapktybBsorjODEqhM16QfD+Fjh4UVQZa0SpvI2zVCAMiClzC4VMqQI44KlBmmt4rk6-VajzVUE6FyuD8IKbaCQVjcj8GEpd2NV3KS7hu7mFtwpAx1DusRQRSrpA5BhCO1x5g4l-pexqOiuaE15uCx9+T1kQz3SKeYRYnBhD3ecfdSM5Sz0EourYix6kjrXdekiesDZG1NubSiT7Cm6oDqEWDMlW5bHDorVMLcZo2gdJag+vc6IkZhbKJYtlFhYl8CKqUK9iyikErBTcoz0wsbUlcjjswcxLGLDabyprYJFucniJR8phLii3FJuBAKqEdIWd0zAsmrSOB7biCOssVPInU6ekTWmMJxCuP4PT0TAWzOBV0+5KS6xmYCdseFSmbM1Ts-slY4sI7rGXNHeI7mrlGZBYs8xIH-NgaTRDOIso0L2mXAsCj2QeWrSCC4OIy7NzEIyMO+NOHpMGaBfM5LJmKDoGwF2T4tQIABey64XLDobSCTCEV0qdHxQSi5LZfKCWGteaaz55JaBeCfG6xlgtsRbh9dsgNgrw3shiXlBybycQRKwyhiusVV7971badQgARhgYQPdsCaggGoUgAALVApA6FdG3Wt5l8dLMhYdGFtT8ssQJGy6sX0Ec-QzduxQB76AntNFe+9r7P2aJaXrWAAL6QguKes6D4s4WrR8pCD4RYBPJQ7HcwSolXQZX4-Qh6Hwsd4giVPflXlugJJbC5BsLyJ490Xsu-+5puH6atNtel2+mXpp8eOEVTwssF1hxK4G-M2KzilaxJh2rFRrrYGMMYSAAWFreA5FI8UhYJSeGK-LQsyw91q22J4MIrII25CAA */
    id: 'factory-agent',
    context: {
      model: model,
      inputMessage: '',
      conversationId: conversationId,
      conversationSlug: conversationSlug,
      response: '',
      previousMessages: [],
      streamResult: undefined,
      intent: {
        intent: 'other',
        complexity: 'simple',
        needsChart: false,
        needsSQL: false,
      },
      promptSource: undefined,
      error: undefined,
      retryCount: 0,
      lastError: undefined,
      enhancementActors: [],
    },
    initial: 'loadContext',
    states: {
      loadContext: {
        invoke: {
          src: 'loadContextActor',
          id: 'LOAD_CONTEXT',
          input: ({ context }: { context: AgentContext }) => ({
            repositories: repositories,
            conversationId: context.conversationId,
          }),
          onDone: {
            target: 'idle',
            actions: assign({
              previousMessages: ({ event }) => event.output,
              model: ({ context }) => context.model,
            }),
          },
          onError: {
            target: 'idle',
          },
        },
      },
      idle: {
        on: {
          USER_INPUT: {
            target: 'running',
            actions: assign({
              previousMessages: ({ event }) => event.messages,
              model: ({ context }) => context.model,
              inputMessage: ({ event }) =>
                event.messages[event.messages.length - 1]?.parts[0]?.text ?? '',
              streamResult: () => undefined,
              error: () => undefined,
              promptSource: ({ event }) => {
                const lastUserMessage = event.messages
                  .filter((m: UIMessage) => m.role === 'user')
                  .pop();
                const source = (
                  lastUserMessage?.metadata as { promptSource?: PromptSource }
                )?.promptSource;
                getLogger().then((logger) =>
                  logger.debug(
                    '[StateMachine] Extracted promptSource from metadata:',
                    source,
                  ),
                );
                return source;
              },
            }),
          },
          STOP: 'stopped',
        },
      },
      running: {
        initial: 'detectIntent',
        on: {
          USER_INPUT: {
            target: 'running',
            actions: assign({
              previousMessages: ({ event }) => event.messages,
              model: ({ context }) => context.model,
              inputMessage: ({ event }) =>
                event.messages[event.messages.length - 1]?.parts[0]?.text ?? '',
              streamResult: undefined,
              promptSource: ({ event }) => {
                const lastUserMessage = event.messages
                  .filter((m: UIMessage) => m.role === 'user')
                  .pop();
                return (
                  lastUserMessage?.metadata as { promptSource?: PromptSource }
                )?.promptSource;
              },
            }),
          },
          STOP: 'idle',
        },
        states: {
          detectIntent: {
            initial: 'attempting',
            states: {
              attempting: {
                invoke: {
                  src: 'detectIntentActorCached',
                  id: 'GET_INTENT',
                  input: ({ context }: { context: AgentContext }) => ({
                    inputMessage: context.inputMessage,
                    model: context.model,
                  }),
                  onDone: [
                    {
                      guard: 'isOther',
                      target: '#factory-agent.running.summarizeIntent',
                      actions: assign({
                        intent: ({ event }) => {
                          const intent = event.output;
                          getLogger().then((logger) =>
                            logger.debug(
                              '[StateMachine] Set intent from detection:',
                              {
                                intent: intent.intent,
                                needsChart: intent.needsChart,
                                needsSQL: intent.needsSQL,
                              },
                            ),
                          );
                          return intent;
                        },
                        retryCount: () => 0,
                        model: ({ context }) => context.model,
                      }),
                    },
                    {
                      guard: 'isGreeting',
                      target: '#factory-agent.running.greeting',
                      actions: assign({
                        intent: ({ event }) => {
                          const intent = event.output;
                          getLogger().then((logger) =>
                            logger.debug(
                              '[StateMachine] Set intent from detection (greeting):',
                              {
                                intent: intent.intent,
                                needsChart: intent.needsChart,
                                needsSQL: intent.needsSQL,
                              },
                            ),
                          );
                          return intent;
                        },
                        retryCount: () => 0,
                        model: ({ context }) => context.model,
                      }),
                    },
                    {
                      guard: 'isReadData',
                      target: '#factory-agent.running.readData',
                      actions: assign({
                        intent: ({ event }) => {
                          const intent = event.output;
                          getLogger().then((logger) =>
                            logger.debug(
                              '[StateMachine] Set intent from detection (readData):',
                              {
                                intent: intent.intent,
                                needsChart: intent.needsChart,
                                needsSQL: intent.needsSQL,
                              },
                            ),
                          );
                          return intent;
                        },
                        retryCount: () => 0,
                        model: ({ context }) => context.model,
                      }),
                    },
                    {
                      guard: 'isSystem',
                      target: '#factory-agent.running.systemInfo',
                      actions: assign({
                        intent: ({ event }) => {
                          const intent = event.output;
                          getLogger().then((logger) =>
                            logger.debug(
                              '[StateMachine] Set intent from detection (system):',
                              {
                                intent: intent.intent,
                                needsChart: intent.needsChart,
                                needsSQL: intent.needsSQL,
                              },
                            ),
                          );
                          return intent;
                        },
                        retryCount: () => 0,
                        model: ({ context }) => context.model,
                      }),
                    },
                  ],
                  onError: [
                    {
                      guard: 'shouldRetry',
                      target: 'retrying',
                      actions: assign({
                        retryCount: ({ context }) =>
                          (context.retryCount || 0) + 1,
                        lastError: ({ event }) => event.error as Error,
                        model: ({ context }) => context.model,
                      }),
                    },
                    {
                      guard: 'retryLimitExceeded',
                      target: '#factory-agent.idle',
                      actions: assign({
                        error: ({ context }) =>
                          `Intent detection failed after 3 retries: ${context.lastError?.message}`,
                        model: ({ context }) => context.model,
                      }),
                    },
                  ],
                },
                after: {
                  30000: {
                    target: 'retrying',
                    guard: 'shouldRetry',
                    actions: assign({
                      retryCount: ({ context }) =>
                        (context.retryCount || 0) + 1,
                      error: () => 'Intent detection timeout',
                      model: ({ context }) => context.model,
                    }),
                  },
                },
              },
              retrying: {
                after: {
                  retryDelay: {
                    target: 'attempting',
                  },
                },
              },
            },
          },
          summarizeIntent: {
            invoke: {
              src: 'summarizeIntentActor',
              id: 'SUMMARIZE_INTENT',
              input: ({ context }: { context: AgentContext }) => ({
                inputMessage: context.inputMessage,
                intent: context.intent,
                previousMessages: context.previousMessages,
                model: context.model,
              }),
              onDone: {
                target: 'streaming',
                actions: assign({
                  streamResult: ({ event }) => event.output,
                  model: ({ context }) => context.model,
                }),
              },
              onError: {
                target: '#factory-agent.idle',
                actions: assign({
                  error: ({ event }) => {
                    const errorMsg =
                      event.error instanceof Error
                        ? event.error.message
                        : String(event.error);
                    getLogger().then((logger) =>
                      logger.error(
                        'summarizeIntent error:',
                        errorMsg,
                        event.error,
                      ),
                    );
                    return errorMsg;
                  },
                  streamResult: undefined,
                  model: ({ context }) => context.model,
                }),
              },
            },
          },
          greeting: {
            invoke: {
              src: 'greetingActor',
              id: 'SALUE',
              input: ({ context }: { context: AgentContext }) => ({
                inputMessage: context.inputMessage,
                model: context.model,
              }),
              onDone: {
                target: 'streaming',
                actions: assign({
                  streamResult: ({ event }) => event.output,
                  model: ({ context }) => context.model,
                }),
              },
              onError: {
                target: '#factory-agent.idle',
                actions: assign({
                  error: ({ event }) => {
                    const errorMsg =
                      event.error instanceof Error
                        ? event.error.message
                        : String(event.error);
                    getLogger().then((logger) =>
                      logger.error('greeting error:', errorMsg, event.error),
                    );
                    return errorMsg;
                  },
                  streamResult: undefined,
                  model: ({ context }) => context.model,
                }),
              },
            },
          },
          readData: {
            type: 'parallel',
            states: {
              processRequest: {
                initial: 'invoking',
                states: {
                  invoking: {
                    invoke: {
                      src: 'readDataAgentActor',
                      id: 'READ_DATA',
                      input: ({ context }: { context: AgentContext }) => {
                        getLogger().then((logger) =>
                          logger.debug(
                            '[StateMachine] Passing to readDataAgentActor:',
                            {
                              promptSource: context.promptSource,
                              intentNeedsSQL: context.intent.needsSQL,
                            },
                          ),
                        );
                        return {
                          inputMessage: context.inputMessage,
                          conversationId: context.conversationSlug,
                          previousMessages: context.previousMessages,
                          model: context.model,
                          repositories: repositories,
                          queryEngine: queryEngine,
                          promptSource: context.promptSource,
                          intent: context.intent,
                        };
                      },
                      onDone: {
                        target: 'completed',
                        actions: assign({
                          streamResult: ({ event }) =>
                            event.output as unknown as AgentContext['streamResult'],
                          retryCount: () => 0,
                          model: ({ context }) => context.model,
                        }),
                      },
                      onError: [
                        {
                          guard: 'shouldRetry',
                          target: 'retrying',
                          actions: assign({
                            retryCount: ({ context }) =>
                              (context.retryCount || 0) + 1,
                            lastError: ({ event }) => event.error as Error,
                            model: ({ context }) => context.model,
                          }),
                        },
                        {
                          target: 'failed',
                          actions: assign({
                            error: ({ event }) => {
                              const errorMsg =
                                event.error instanceof Error
                                  ? event.error.message
                                  : String(event.error);
                              getLogger().then((logger) =>
                                logger.error(
                                  'readData error:',
                                  errorMsg,
                                  event.error,
                                ),
                              );
                              return errorMsg;
                            },
                            streamResult: undefined,
                            model: ({ context }) => context.model,
                          }),
                        },
                      ],
                    },
                    after: {
                      120000: {
                        target: 'failed',
                        actions: assign({
                          error: () => 'ReadData timeout after 120 seconds',
                          model: ({ context }) => context.model,
                        }),
                      },
                    },
                  },
                  retrying: {
                    after: {
                      retryDelay: {
                        target: 'invoking',
                      },
                    },
                  },
                  completed: {
                    type: 'final',
                  },
                  failed: {
                    type: 'final',
                  },
                },
              },
              // Background enhancement (runs in parallel)
              backgroundEnhancement: {
                initial: 'idle',
                states: {
                  idle: {
                    type: 'final',
                  },
                },
              },
            },
            onDone: {
              target: 'streaming',
            },
          },
          systemInfo: {
            invoke: {
              src: 'systemInfoActor',
              id: 'SYSTEM_INFO',
              input: ({ context }: { context: AgentContext }) => ({
                inputMessage: context.inputMessage,
              }),
              onDone: {
                target: 'streaming',
                actions: assign({
                  streamResult: ({ event }) => event.output,
                  model: ({ context }) => context.model,
                }),
              },
              onError: {
                target: '#factory-agent.idle',
                actions: assign({
                  error: ({ event }) => {
                    const errorMsg =
                      event.error instanceof Error
                        ? event.error.message
                        : String(event.error);
                    getLogger().then((logger) =>
                      logger.error('systemInfo error:', errorMsg, event.error),
                    );
                    return errorMsg;
                  },
                  streamResult: undefined,
                  model: ({ context }) => context.model,
                }),
              },
            },
          },
          streaming: {
            on: {
              FINISH_STREAM: {
                target: '#factory-agent.idle',
              },
            },
          },
        },
      },
      stopped: {
        type: 'final',
      },
    },
  });
};
