import { setup, assign } from 'xstate';
import { fromPromise } from 'xstate/actors';
import { AgentContext, AgentEvents } from './types';
import { detectIntent } from './actors/detect-intent.actor';
import { summarizeIntent } from './actors/summarize-intent.actor';
import { greeting } from './actors/greeting.actor';
import { readDataAgent } from './actors/read-data-agent.actor';
import { loadContext } from './actors/load-context.actor';
import { MessagePersistenceService } from '../services/message-persistence.service';
import { Repositories } from '@qwery/domain/repositories';
import { createCachedActor } from './utils/actor-cache';
import type { TelemetryManager } from '@qwery/telemetry-opentelemetry';
import { AGENT_EVENTS } from '@qwery/telemetry-opentelemetry/events/agent.events';
import type { UIMessage } from 'ai';
import {
  context as otelContext,
  trace,
  type SpanContext,
} from '@opentelemetry/api';

export const createStateMachine = (
  conversationId: string,
  model: string,
  repositories: Repositories,
  telemetry?: TelemetryManager,
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
      (typeof usageObj.promptTokens === 'number' ? usageObj.promptTokens : 0) ||
      (typeof usageObj.prompt_tokens === 'number'
        ? usageObj.prompt_tokens
        : 0) ||
      0;

    const completionTokens =
      (typeof usageObj.outputTokens === 'number' ? usageObj.outputTokens : 0) ||
      (typeof usageObj.completionTokens === 'number'
        ? usageObj.completionTokens
        : 0) ||
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

  // Create telemetry-wrapped actors
  // All actors use startSpan for consistent nesting behavior
  // OpenTelemetry's AsyncLocalStorage should preserve context across async boundaries
  // Since we wrap _executeRespond in context.with(), the message span should be active
  // when actors are invoked, allowing proper parent-child nesting
  const detectIntentActor = fromPromise(
    async ({
      input,
    }: {
      input: {
        inputMessage: string;
      };
    }): Promise<AgentContext['intent']> => {
      if (!telemetry) {
        const result = await detectIntent(input.inputMessage, model);
        return result.object;
      }

      const startTime = Date.now();
      // Use startSpan for proper parent-child nesting
      // OpenTelemetry's AsyncLocalStorage should preserve context across async boundaries
      // If context is preserved (message span is active), spans will nest properly
      const span = telemetry.startSpan('agent.actor.detectIntent', {
        'agent.actor.id': 'detectIntent',
        'agent.actor.type': 'detectIntent',
        'agent.actor.input': JSON.stringify({
          inputMessage: input.inputMessage,
        }),
        'agent.conversation.id': conversationId,
      });

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
            const result = await detectIntent(input.inputMessage, model);
            const duration = Date.now() - startTime;

            // Record token usage if available
            // Usage might be a promise or synchronous depending on provider
            let usage: unknown = null;
            if (result.usage) {
              // Handle both promise and synchronous usage
              if (result.usage instanceof Promise) {
                try {
                  usage = await result.usage;
                } catch {
                  // Ignore errors in usage promise
                }
              } else {
                usage = result.usage;
              }
            }

            if (usage) {
              // LanguageModelV2Usage structure varies by provider
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

                // Also record as metrics
                telemetry.recordTokenUsage(promptTokens, completionTokens, {
                  'agent.llm.model.name': 'gpt-5-mini',
                  'agent.llm.provider.id': 'azure',
                  'agent.actor.id': 'detectIntent',
                  'agent.conversation.id': conversationId,
                });
              }
            }

            telemetry.captureEvent({
              name: AGENT_EVENTS.ACTOR_COMPLETED,
              attributes: {
                'agent.actor.id': 'detectIntent',
                'agent.actor.type': 'detectIntent',
                'agent.actor.duration_ms': String(duration),
                'agent.actor.status': 'success',
                'agent.conversation.id': conversationId,
              },
            });

            telemetry.endSpan(span, true);
            return result.object;
          } catch (error) {
            const duration = Date.now() - startTime;
            const errorMessage =
              error instanceof Error ? error.message : String(error);

            telemetry.captureEvent({
              name: AGENT_EVENTS.ACTOR_FAILED,
              attributes: {
                'agent.actor.id': 'detectIntent',
                'agent.actor.type': 'detectIntent',
                'agent.actor.duration_ms': String(duration),
                'agent.actor.status': 'error',
                'error.type':
                  error instanceof Error ? error.name : 'UnknownError',
                'error.message': errorMessage,
                'agent.conversation.id': conversationId,
              },
            });

            telemetry.endSpan(span, false);
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
      };
    }) => {
      if (!telemetry) {
        return summarizeIntent(input.inputMessage, input.intent);
      }

      const startTime = Date.now();
      // Use startSpan for proper parent-child nesting
      // OpenTelemetry's AsyncLocalStorage should preserve context across async boundaries
      // If context is preserved (message span is active), spans will nest properly
      const span = telemetry.startSpan('agent.actor.summarizeIntent', {
        'agent.actor.id': 'summarizeIntent',
        'agent.actor.type': 'summarizeIntent',
        'agent.conversation.id': conversationId,
      });

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
            const duration = Date.now() - startTime;

            // Capture token usage from streamText result (usage is a promise)
            // For Azure/Ollama providers, usage will be available when stream completes
            if (result.usage) {
              try {
                const usage = await result.usage;
                if (usage && telemetry) {
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

                    // Also record as metrics
                    telemetry.recordTokenUsage(promptTokens, completionTokens, {
                      'agent.llm.model.name': 'gpt-5-mini',
                      'agent.llm.provider.id': 'azure',
                      'agent.actor.id': 'summarizeIntent',
                      'agent.conversation.id': conversationId,
                    });
                  }
                }
              } catch {
                // Ignore errors in usage capture
              }
            }

            telemetry.captureEvent({
              name: AGENT_EVENTS.ACTOR_COMPLETED,
              attributes: {
                'agent.actor.id': 'summarizeIntent',
                'agent.actor.type': 'summarizeIntent',
                'agent.actor.duration_ms': String(duration),
                'agent.actor.status': 'success',
                'agent.conversation.id': conversationId,
              },
            });

            telemetry.endSpan(span, true);
            return result;
          } catch (error) {
            const duration = Date.now() - startTime;
            const errorMessage =
              error instanceof Error ? error.message : String(error);

            telemetry.captureEvent({
              name: AGENT_EVENTS.ACTOR_FAILED,
              attributes: {
                'agent.actor.id': 'summarizeIntent',
                'agent.actor.type': 'summarizeIntent',
                'agent.actor.duration_ms': String(duration),
                'agent.actor.status': 'error',
                'error.type':
                  error instanceof Error ? error.name : 'UnknownError',
                'error.message': errorMessage,
                'agent.conversation.id': conversationId,
              },
            });

            telemetry.endSpan(span, false);
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
      };
    }) => {
      if (!telemetry) {
        return greeting(input.inputMessage, model);
      }

      const startTime = Date.now();
      // Use startSpan for proper parent-child nesting
      // OpenTelemetry's AsyncLocalStorage should preserve context across async boundaries
      // If context is preserved (message span is active), spans will nest properly
      const span = telemetry.startSpan('agent.actor.greeting', {
        'agent.actor.id': 'greeting',
        'agent.actor.type': 'greeting',
        'agent.conversation.id': conversationId,
      });

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
            const result = await greeting(input.inputMessage, model);
            const duration = Date.now() - startTime;

            // Capture token usage from streamText result (usage is a promise)
            // For Azure/Ollama providers, usage will be available when stream completes
            if (result.usage) {
              try {
                const usage = await result.usage;
                if (usage && telemetry) {
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

                    // Also record as metrics
                    telemetry.recordTokenUsage(promptTokens, completionTokens, {
                      'agent.llm.model.name': 'gpt-5-mini',
                      'agent.llm.provider.id': 'azure',
                      'agent.actor.id': 'greeting',
                      'agent.conversation.id': conversationId,
                    });
                  }
                }
              } catch {
                // Ignore errors in usage capture
              }
            }

            telemetry.captureEvent({
              name: AGENT_EVENTS.ACTOR_COMPLETED,
              attributes: {
                'agent.actor.id': 'greeting',
                'agent.actor.type': 'greeting',
                'agent.actor.duration_ms': String(duration),
                'agent.actor.status': 'success',
                'agent.conversation.id': conversationId,
              },
            });

            telemetry.endSpan(span, true);
            return result;
          } catch (error) {
            const duration = Date.now() - startTime;
            const errorMessage =
              error instanceof Error ? error.message : String(error);

            telemetry.captureEvent({
              name: AGENT_EVENTS.ACTOR_FAILED,
              attributes: {
                'agent.actor.id': 'greeting',
                'agent.actor.type': 'greeting',
                'agent.actor.duration_ms': String(duration),
                'agent.actor.status': 'error',
                'error.type':
                  error instanceof Error ? error.name : 'UnknownError',
                'error.message': errorMessage,
                'agent.conversation.id': conversationId,
              },
            });

            telemetry.endSpan(span, false);
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
      };
    }) => {
      if (!telemetry) {
        return readDataAgent(
          input.conversationId,
          input.previousMessages,
          model,
        );
      }

      const startTime = Date.now();
      // Use startSpan for proper parent-child nesting
      // OpenTelemetry's AsyncLocalStorage should preserve context across async boundaries
      // If context is preserved (message span is active), spans will nest properly
      const span = telemetry.startSpan('agent.actor.readData', {
        'agent.actor.id': 'readData',
        'agent.actor.type': 'readData',
        'agent.conversation.id': conversationId,
      });

      telemetry.captureEvent({
        name: AGENT_EVENTS.ACTOR_INVOKED,
        attributes: {
          'agent.actor.id': 'readData',
          'agent.actor.type': 'readData',
          'agent.conversation.id': conversationId,
        },
      });

      // Run within the span's context to ensure proper nesting
      return otelContext.with(
        trace.setSpan(otelContext.active(), span),
        async () => {
          try {
            const result = await readDataAgent(
              input.conversationId,
              input.previousMessages,
              model,
            );
            const duration = Date.now() - startTime;

            // Capture token usage from Experimental_Agent stream result (usage is a promise)
            if (result.usage) {
              try {
                const usage = await result.usage;
                if (usage && telemetry) {
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

                    // Also record as metrics
                    telemetry.recordTokenUsage(promptTokens, completionTokens, {
                      'agent.llm.model.name': 'gpt-5-mini',
                      'agent.llm.provider.id': 'azure',
                      'agent.actor.id': 'readData',
                      'agent.conversation.id': conversationId,
                    });
                  }
                }
              } catch {
                // Ignore errors in usage capture
              }
            }

            telemetry.captureEvent({
              name: AGENT_EVENTS.ACTOR_COMPLETED,
              attributes: {
                'agent.actor.id': 'readData',
                'agent.actor.type': 'readData',
                'agent.actor.duration_ms': String(duration),
                'agent.actor.status': 'success',
                'agent.conversation.id': conversationId,
              },
            });

            telemetry.endSpan(span, true);
            return result;
          } catch (error) {
            const duration = Date.now() - startTime;
            const errorMessage =
              error instanceof Error ? error.message : String(error);

            telemetry.captureEvent({
              name: AGENT_EVENTS.ACTOR_FAILED,
              attributes: {
                'agent.actor.id': 'readData',
                'agent.actor.type': 'readData',
                'agent.actor.duration_ms': String(duration),
                'agent.actor.status': 'error',
                'error.type':
                  error instanceof Error ? error.name : 'UnknownError',
                'error.message': errorMessage,
                'agent.conversation.id': conversationId,
              },
            });

            telemetry.endSpan(span, false);
            throw error;
          }
        },
      );
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
      if (!telemetry) {
        const result = await loadContext(
          input.repositories,
          input.conversationId,
        );
        return MessagePersistenceService.convertToUIMessages(result);
      }

      const startTime = Date.now();
      // Use startSpan for proper parent-child nesting
      // OpenTelemetry's AsyncLocalStorage should preserve context across async boundaries
      // If context is preserved (message span is active), spans will nest properly
      // Note: loadContext may run before conversation/message spans, so it might not nest
      const span = telemetry.startSpan('agent.actor.loadContext', {
        'agent.actor.id': 'loadContext',
        'agent.actor.type': 'loadContext',
        'agent.conversation.id': conversationId,
      });

      // Store span reference so we can add links later when conversation/message spans are created
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
            const duration = Date.now() - startTime;

            telemetry.captureEvent({
              name: AGENT_EVENTS.ACTOR_COMPLETED,
              attributes: {
                'agent.actor.id': 'loadContext',
                'agent.actor.type': 'loadContext',
                'agent.actor.duration_ms': String(duration),
                'agent.actor.status': 'success',
                'agent.context.message_count': messages.length,
                'agent.conversation.id': conversationId,
              },
            });

            telemetry.endSpan(span, true);
            return messages;
          } catch (error) {
            const duration = Date.now() - startTime;
            const errorMessage =
              error instanceof Error ? error.message : String(error);

            telemetry.captureEvent({
              name: AGENT_EVENTS.ACTOR_FAILED,
              attributes: {
                'agent.actor.id': 'loadContext',
                'agent.actor.type': 'loadContext',
                'agent.actor.duration_ms': String(duration),
                'agent.actor.status': 'error',
                'error.type':
                  error instanceof Error ? error.name : 'UnknownError',
                'error.message': errorMessage,
                'agent.conversation.id': conversationId,
              },
            });

            telemetry.endSpan(span, false);
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
        (input: { inputMessage: string }) => input.inputMessage, // Cache key
        60000, // 1 minute TTL
      ),
      summarizeIntentActor,
      greetingActor,
      readDataAgentActor,
      loadContextActor,
    },
    guards: {
      //eslint-disable-next-line @typescript-eslint/no-explicit-any
      isGreeting: ({ event }: { event: any }) =>
        event.output?.intent === 'greeting',

      isOther: ({ event }) => event.output?.intent === 'other',

      isReadData: ({ event }) => event.output?.intent === 'read-data',

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
        return Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
      },
    },
  });
  return defaultSetup.createMachine({
    /** @xstate-layout N4IgpgJg5mDOIC5QDMCGBjALgewE4E8BaVGAO0wDoAbbVCAYW3LAA9MBiCJsCgS1IBu2ANY8AMgHkAggBEA+vQkA5ACoBRABoqA2gAYAuolAAHbLF6ZeTIyBaIALLoBsFAIwAOAOz2AnACYAZgBWJ3d3e3sAgBoQfEQ-V1cKXx8fT1cg-1cA3SD3AF98mLQsPCISMHJqWgYmTFYOMFxcPApjKlRMZDwAWwpJWQVldS09QyQQU3NLawm7BD8ne08KIN1PTwD7JyDXJZ8YuIQc+wofIJzPH2XdAI2CopASnAJiMkpeCCowdgBVAGU1AAlOQASSUAAVfjoDDYphYrKQbPMgn5Doh3EkUmlPIsnE5XAkHsUMC9yu8+F8fv8VBIIWM4WYEbNQPMAokVuc-O5Ak5rn5buiEPZMRQnH5HM5dAKvOLPIUSaVXhUqrgAK6kUj8KB-QEg8FQmHjExMmZIuaIQl81YBHy3HJBdJOXT2IUBPw+Ci4na6RKJAJODYKp6kspvSqUdWa7XsGl0hkTeFm5HxJYrNYbLY7Pa+IXufxi3T+cKRbI+JbB55hlWRjVa0hQCgQMD1LCg5hVTr1HrGSwNzjcPiCEQ8ADiahUYNUalUCZN00RKYQrmlnvsRM8volPjC0ViiEdns84p87O23PdAUroeVFKj9cbzdbmHb9U7mG7vZjXFIPH4QlEChx0ncF1FnVxjUmU1FwtZdbjXDct18Xc80DCgAh5dIAnZW4+Sca8lXJCMKHvbUmxbMA2w7SguzAHs+x1H8-2HQDgKnMCdD8SCkxg1lLRdBCPE3QlkPcPcjgyFcKEWIJfD8IJZK8c4CLJcNVTrMin0ol9qIoWj6JjJoWlwNoOi6XogIndiZyNRkFxZWwD3SdCeRLHJTycO4hVcK4AmSexdguHyNkcPwVOrO8NIbcjn1fYj9K-fsjNadpOm6XA+jY0CbO0CC7OZc0+IWNNVnWTZtl2fZvOlPz3EyRZEgiVEMnC29iNI6KtKot8aI-OjEp1FhYEwToeFQZB6lwAAKHJdDmgBKdgqza9To06ijuvivqDIbOcoPswrHIQR0kgw7kIncgMvP3Zc+U9VIBQCj1rlPVqiNWh8Yu0uLVRbAgYyGkb6j0iamim3A-vwGQwA6fBFuW97azWx8Np0nqSMh7U9p4hz5lxT1uTtdw+XzAKFO8nY-GSfwXX2SUr0eBG1KRz7YDVHoelQXBeAALzAH6OCYocAJ4f5fgAWXFqQgVBAAtNRrNnWFE2g3HLXSXQvR2PIi3FW4giFTIVh885UnddI1iCN7mZIqLGzZjmud5-nqPYZKTNS8yMooMXJeluWFeypXuNVw75kWZZSszCqcwOG6AtOc4TguMJpVCa2a1t5GKCgCGW2-Qd-xHH2pDEX41Gx0OlxzU5MXkgLPAUglxTzUVPL8TdcVyW1PGJENCJtjrG1zsB86S5oUrM9K+n+Uvy8rg6lwj9MyqzSrcxuzY12cDJ3XxDv7AzyLs4hugZE6VAB1-ChhtGigmczoeMbPi+F4KpeA01-NnHOjDcicbyFw-ISkepuHwhI8hH3anbZ+EBz4jTaC0dAcBYBAjAAARzVHAD4LEC7XyLoBIEahBgyCkCoKQb9kywQ8NyNwIRuS3DKv4Tw3kHQUF0HVVyzhNzuitozG8iMs6fVPnAi+iDsDINgKgjBWDhrCxEIZCeHsp4WSISQshFDlbznftQ1ydDxTuEYRsZhFN3RnAChkXI6wI4M0VKpR+MCRHwNQOIyR0jMHYPkcIRRxlTJpVUcQ+QpDyG5RDovXRtCMgGKMVcDu3lfBJAei6M6wQO5QI+mRJxYjjBIJQWgjxciCEA1vsDcak0pqEjmgtJaAjB6OLAC-BBOSJF5JkZ4opu0tH7R0UVGh7h9EMMuLElhN0yz9JTqeTIT0rjyn4QPBxJ8GmiKabkqR+TZGRkxv2QGd8ylgwhpgAg0NYbw1qQs4RSznGuNaQUzZhz8BYy6TjMOlo0iejqtcDksk7jrEAXVfygUfK+hCmFOZ9jj6s0OQ0noMYABi4JQT-AABJyBpGo8WlDeJHWXlHcq2Yqo3WuH5Fc-g7h1WPBVQojxSDYGbPACYD93j5SoUVQgIyjiEHwmCiKxEaB0EYMwNgzKsUojRDdPwEppIyTuN4RIaRIjpI+FSYVatji3FOAFHIWw-TSkFPHHkbgJTOAiBrW02FFVCO1Cql5wpXBChFEkQI5wXSyUCPmLYFqn5dTRhGa1S58yAKWGcGmfIJVbyLJ6mB3qBZ6W2gNP11DroSUbgTLYTq9hXB2JG7O0bdIHP+g2BNRUwhU1PI3PYtwMipDtaM3EGrQjinkvXcBh9uUrRZmRB2nNuZ8wFkWo62RXCnGPCEDwOFUjlkNqEL0toHWGLtL6PhdieUZOiiPMeUB+3zGyJsM4zpiyblkiEdwqEggUA+dyJuER1g+GzRcxpqAt2WmCKcRdzpHS+CuLJby2RNYcLyJYsSSwl393BdAxZD7rlrLacNJ9y5QrsKibkbwbzv2jISOmclpK1jyVxHezJlzsmrPcRsrxVqVbhN6QFP9SGP2oddKM50VMOFiRdBKossr8PRSySslp0HbkY3ueR7RLLsXZD8hmcIN7syRApr4dCGF3Trm5IGF0XHGw8Zcc0tx6zPHoGwD2b49QIBwYSNhKOUnM27Fk6M3h57CS2l9LkOV6nYFXO0zc0jaBeDfBMxRnpYnzOSccFZod4lLSW3YbsT5pNnRDtc5pigAAjDAwhc7YA1BANQpAAAWqBSDIJ6L6-zont0Ibfchz95wGPJpFOhHc8kxJ1V2HsBLhGEEpfQGllomXst5YK3RYinxvhwaHWsRDIRKv0e8mJM9+YeSfOlCp29bbBFP2GqfGFhaSsiviMsM9CltjgOlCuSI7LEB2j8vu86pZbQVlWzbYa2BjDGEgHB90CR6u+gDOcFDQ77WGPPVvIm7pywRCpfkIAA */
    id: 'factory-agent',
    context: {
      model: model,
      inputMessage: '',
      conversationId: conversationId,
      response: '',
      previousMessages: [],
      streamResult: undefined,
      intent: {
        intent: 'other',
        complexity: 'simple',
      },
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
              inputMessage: ({ event }) =>
                event.messages[event.messages.length - 1]?.parts[0]?.text ?? '',
              streamResult: () => undefined, // Clear previous result when starting new request
              error: () => undefined,
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
                        intent: ({ event }) => event.output,
                        retryCount: () => 0, // Reset on success
                      }),
                    },
                    {
                      guard: 'isGreeting',
                      target: '#factory-agent.running.greeting',
                      actions: assign({
                        intent: ({ event }) => event.output,
                        retryCount: () => 0,
                      }),
                    },
                    {
                      guard: 'isReadData',
                      target: '#factory-agent.running.readData',
                      actions: assign({
                        intent: ({ event }) => event.output,
                        retryCount: () => 0,
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
                      }),
                    },
                    {
                      guard: 'retryLimitExceeded',
                      target: '#factory-agent.idle',
                      actions: assign({
                        error: ({ context }) =>
                          `Intent detection failed after 3 retries: ${context.lastError?.message}`,
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
                    console.error(
                      'summarizeIntent error:',
                      errorMsg,
                      event.error,
                    );
                    return errorMsg;
                  },
                  streamResult: undefined,
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
                    console.error('greeting error:', errorMsg, event.error);
                    return errorMsg;
                  },
                  streamResult: undefined,
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
                      input: ({ context }: { context: AgentContext }) => ({
                        inputMessage: context.inputMessage,
                        conversationId: context.conversationId,
                        previousMessages: context.previousMessages,
                        model: context.model,
                        repositories: repositories,
                      }),
                      onDone: {
                        target: 'completed',
                        actions: assign({
                          streamResult: ({ event }) => event.output,
                          retryCount: () => 0, // Reset on success
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
                              console.error(
                                'readData error:',
                                errorMsg,
                                event.error,
                              );
                              return errorMsg;
                            },
                            streamResult: undefined,
                          }),
                        },
                      ],
                    },
                    after: {
                      120000: {
                        target: 'failed',
                        actions: assign({
                          error: () => 'ReadData timeout after 120 seconds',
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
              // NEW: Background enhancement (runs in parallel)
              backgroundEnhancement: {
                initial: 'idle',
                states: {
                  idle: {
                    // Background enhancement is handled by enhanceBusinessContextInBackground
                    // which is already non-blocking, so this state just tracks it
                    type: 'final',
                  },
                },
              },
            },
            onDone: {
              target: 'streaming',
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
