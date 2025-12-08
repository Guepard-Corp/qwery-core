import { FinishReason, UIMessage } from 'ai';
import { createActor } from 'xstate';
import { nanoid } from 'nanoid';
import { createStateMachine } from './state-machine';
import { Repositories } from '@qwery/domain/repositories';
import { ActorRegistry } from './utils/actor-registry';
import { persistState } from './utils/state-persistence';
import {
  UsagePersistenceService,
  MessagePersistenceService,
} from '../services';
import type { TelemetryManager } from '@qwery/telemetry-opentelemetry';
import { AGENT_EVENTS } from '@qwery/telemetry-opentelemetry/events/agent.events';
import { context, trace } from '@opentelemetry/api';

export interface FactoryAgentOptions {
  conversationSlug: string;
  model: string;
  repositories: Repositories;
  telemetry?: TelemetryManager;
}

export class FactoryAgent {
  readonly id: string;
  private readonly conversationSlug: string;
  private lifecycle: ReturnType<typeof createStateMachine>;
  private factoryActor: ReturnType<typeof createActor>;
  private repositories: Repositories;
  private actorRegistry: ActorRegistry; // NEW: Actor registry
  private model: string;
  private readonly telemetry?: TelemetryManager;

  constructor(opts: FactoryAgentOptions) {
    this.id = nanoid();
    this.conversationSlug = opts.conversationSlug;
    this.repositories = opts.repositories;
    this.actorRegistry = new ActorRegistry(); // NEW
    this.model = opts.model;
    this.telemetry = opts.telemetry;

    this.lifecycle = createStateMachine(
      this.conversationSlug,
      this.model,
      this.repositories,
      this.telemetry,
    );

    // NEW: Load persisted state (async, but we'll handle it)
    // For now, we'll start without persisted state and load it asynchronously
    this.factoryActor = createActor(
      this.lifecycle as ReturnType<typeof createStateMachine>,
    );

    // NEW: Register main factory actor
    this.actorRegistry.register('factory', this.factoryActor);

    // NEW: Persist state on changes
    this.factoryActor.subscribe((state) => {
      console.log('###Factory state:', state.value);
      if (state.status === 'active') {
        persistState(
          this.conversationSlug,
          state.snapshot,
          this.repositories,
        ).catch((err) => {
          console.warn('[FactoryAgent] Failed to persist state:', err);
        });
      }
    });

    this.factoryActor.start();
  }

  // NEW: Method to get registry
  getActorRegistry(): ActorRegistry {
    return this.actorRegistry;
  }

  // NEW: Cleanup on destroy
  destroy(): void {
    this.actorRegistry.stopAll();
    this.factoryActor.stop();
  }

  /**
   * Called from your API route / server action.
   * It wires the UI messages into the machine, waits for the LLM stream
   * to be produced by the `generateLLMResponse` action, and returns
   * a streaming Response compatible with the AI SDK UI.
   */
  async respond(opts: { messages: UIMessage[] }): Promise<Response> {
    console.log(
      `Message received, factory state [${this.id}]:`,
      this.factoryActor.getSnapshot().value,
    );

    // Start conversation span if telemetry is available
    const conversationSpan = this.telemetry?.startSpan('agent.conversation', {
      'agent.conversation.id': this.conversationSlug,
      'agent.id': this.id,
      'agent.conversation.message_count': opts.messages.length,
    });

    if (this.telemetry) {
      this.telemetry.captureEvent({
        name: AGENT_EVENTS.CONVERSATION_STARTED,
        attributes: {
          'agent.conversation.id': this.conversationSlug,
          'agent.id': this.id,
          'agent.conversation.message_count': opts.messages.length,
        },
      });
    }

    // Get the current input message to track which request this is for
    const lastMessage = opts.messages[opts.messages.length - 1];

    // Persist latest user message
    const messagePersistenceService = new MessagePersistenceService(
      this.repositories.message,
      this.repositories.conversation,
      this.conversationSlug,
    );
    messagePersistenceService.persistMessages([lastMessage as UIMessage]);

    const textPart = lastMessage?.parts.find((p) => p.type === 'text');
    const currentInputMessage =
      textPart && 'text' in textPart ? (textPart.text as string) : '';

    // Start message span if telemetry is available
    const messageSpan = this.telemetry?.startSpan('agent.message', {
      'agent.conversation.id': this.conversationSlug,
      'agent.message.text': currentInputMessage,
      'agent.message.index': opts.messages.length - 1,
      'agent.message.role': 'user',
    });

    if (this.telemetry && messageSpan) {
      this.telemetry.captureEvent({
        name: AGENT_EVENTS.MESSAGE_RECEIVED,
        attributes: {
          'agent.conversation.id': this.conversationSlug,
          'agent.message.text': currentInputMessage,
          'agent.message.index': opts.messages.length - 1,
        },
      });
    }

    //console.log("Last user text:", JSON.stringify(opts.messages, null, 2));

    const conversationStartTime = Date.now();
    const messageEnded = { current: false };

    // Run the promise within the conversation span's context for proper nesting
    const runInContext = async () => {
      if (this.telemetry && conversationSpan) {
        // Set conversation span as active so child spans nest properly
        return context.with(
          trace.setSpan(context.active(), conversationSpan),
          async () => {
            // Set message span as active within conversation context
            if (messageSpan) {
              return context.with(
                trace.setSpan(context.active(), messageSpan),
                async () => {
                  return await this._executeRespond(
                    opts,
                    conversationSpan,
                    messageSpan,
                    conversationStartTime,
                    messageEnded,
                  );
                },
              );
            }
            return await this._executeRespond(
              opts,
              conversationSpan,
              messageSpan,
              conversationStartTime,
              messageEnded,
            );
          },
        );
      }
      return await this._executeRespond(
        opts,
        conversationSpan,
        messageSpan,
        conversationStartTime,
        messageEnded,
      );
    };

    return await runInContext();
  }

  private async _executeRespond(
    opts: { messages: UIMessage[] },
    conversationSpan: ReturnType<TelemetryManager['startSpan']> | undefined,
    messageSpan: ReturnType<TelemetryManager['startSpan']> | undefined,
    conversationStartTime: number,
    messageEnded: { current: boolean },
  ): Promise<Response> {
    // Extract current input message for logging
    const lastMessage = opts.messages[opts.messages.length - 1];
    const textPart = lastMessage?.parts.find((p) => p.type === 'text');
    const currentInputMessage =
      textPart && 'text' in textPart ? (textPart.text as string) : '';

    return await new Promise<Response>((resolve, reject) => {
      let resolved = false;
      let requestStarted = false;
      let lastState: string | undefined;
      let stateChangeCount = 0;

      const timeout = setTimeout(() => {
        if (!resolved) {
          subscription.unsubscribe();

          // End spans on timeout
          if (this.telemetry && messageSpan && !messageEnded.current) {
            messageEnded.current = true;
            const messageDuration = Date.now() - conversationStartTime;
            this.telemetry.captureEvent({
              name: AGENT_EVENTS.MESSAGE_ERROR,
              attributes: {
                'agent.conversation.id': this.conversationSlug,
                'error.message': 'Response timeout',
                'agent.message.duration_ms': String(messageDuration),
              },
            });
            this.telemetry.endSpan(messageSpan, false);
          }

          if (this.telemetry && conversationSpan) {
            const conversationDuration = Date.now() - conversationStartTime;
            this.telemetry.captureEvent({
              name: AGENT_EVENTS.CONVERSATION_ERROR,
              attributes: {
                'agent.conversation.id': this.conversationSlug,
                'error.message': `Response timeout: Last state: ${lastState}, state changes: ${stateChangeCount}`,
                'agent.conversation.duration_ms': String(conversationDuration),
              },
            });
            this.telemetry.endSpan(conversationSpan, false);
          }

          reject(
            new Error(
              `FactoryAgent response timeout: state machine did not produce streamResult within 120 seconds. Last state: ${lastState}, state changes: ${stateChangeCount}`,
            ),
          );
        }
      }, 120000);

      let userInputSent = false;

      const sendUserInput = () => {
        if (!userInputSent) {
          userInputSent = true;
          console.log(
            `[FactoryAgent ${this.id}] Sending USER_INPUT event with message: "${currentInputMessage}"`,
          );
          this.factoryActor.send({
            type: 'USER_INPUT',
            messages: opts.messages,
          });
          console.log(
            `[FactoryAgent ${this.id}] USER_INPUT sent, current state:`,
            this.factoryActor.getSnapshot().value,
          );
        }
      };

      const subscription = this.factoryActor.subscribe((state) => {
        const ctx = state.context;
        const currentState =
          typeof state.value === 'string'
            ? state.value
            : JSON.stringify(state.value);
        lastState = currentState;
        stateChangeCount++;

        // Debug logging for state transitions
        if (
          stateChangeCount <= 5 ||
          currentState.includes('detectIntent') ||
          currentState.includes('greeting')
        ) {
          console.log(
            `[FactoryAgent ${this.id}] State: ${currentState}, Changes: ${stateChangeCount}, HasError: ${!!ctx.error}, HasStreamResult: ${!!ctx.streamResult}`,
          );
        }

        // Wait for idle state before sending USER_INPUT
        if (currentState === 'idle' && !userInputSent) {
          sendUserInput();
          return;
        }

        // Check for errors in context
        if (ctx.error) {
          console.error(
            `[FactoryAgent ${this.id}] Error in context:`,
            ctx.error,
          );
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            subscription.unsubscribe();

            // End message span on error
            if (this.telemetry && messageSpan && !messageEnded.current) {
              messageEnded.current = true;
              const messageDuration = Date.now() - conversationStartTime;
              this.telemetry.captureEvent({
                name: AGENT_EVENTS.MESSAGE_ERROR,
                attributes: {
                  'agent.conversation.id': this.conversationSlug,
                  'error.message': ctx.error,
                  'agent.message.duration_ms': String(messageDuration),
                },
              });
              this.telemetry.endSpan(messageSpan, false);
            }

            // End conversation span on error
            if (this.telemetry && conversationSpan) {
              const conversationDuration = Date.now() - conversationStartTime;
              this.telemetry.captureEvent({
                name: AGENT_EVENTS.CONVERSATION_ERROR,
                attributes: {
                  'agent.conversation.id': this.conversationSlug,
                  'error.message': ctx.error,
                  'agent.conversation.duration_ms':
                    String(conversationDuration),
                },
              });
              this.telemetry.endSpan(conversationSpan, false);
            }

            reject(new Error(`State machine error: ${ctx.error}`));
          }
          return;
        }

        // Check if we're back to idle without a streamResult (error case)
        if (
          currentState.includes('idle') &&
          !ctx.streamResult &&
          stateChangeCount > 2 &&
          ctx.error
        ) {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            subscription.unsubscribe();

            // End message span on error
            if (this.telemetry && messageSpan && !messageEnded.current) {
              messageEnded.current = true;
              const messageDuration = Date.now() - conversationStartTime;
              this.telemetry.captureEvent({
                name: AGENT_EVENTS.MESSAGE_ERROR,
                attributes: {
                  'agent.conversation.id': this.conversationSlug,
                  'error.message': ctx.error,
                  'agent.message.duration_ms': String(messageDuration),
                },
              });
              this.telemetry.endSpan(messageSpan, false);
            }

            // End conversation span on error
            if (this.telemetry && conversationSpan) {
              const conversationDuration = Date.now() - conversationStartTime;
              this.telemetry.captureEvent({
                name: AGENT_EVENTS.CONVERSATION_ERROR,
                attributes: {
                  'agent.conversation.id': this.conversationSlug,
                  'error.message': ctx.error,
                  'agent.conversation.duration_ms':
                    String(conversationDuration),
                },
              });
              this.telemetry.endSpan(conversationSpan, false);
            }

            reject(new Error(`State machine error: ${ctx.error}`));
          }
          return;
        }

        // Check if we're stuck in detectIntent for too long
        if (currentState.includes('detectIntent') && stateChangeCount > 10) {
          console.warn(
            `[FactoryAgent ${this.id}] Appears stuck in detectIntent after ${stateChangeCount} state changes`,
          );
          return;
        }

        // Mark that we've started processing (state is running or we have a result)
        if (state.value === 'running' || ctx.streamResult) {
          requestStarted = true;
        }

        // When the state machine has produced the StreamTextResult, verify it's for the current request
        if (ctx.streamResult && requestStarted) {
          // Verify this result is for the current request by checking inputMessage matches
          const resultInputMessage = ctx.inputMessage;
          const currentInputMessage =
            (opts.messages[opts.messages.length - 1]?.parts.find(
              (p) => p.type === 'text' && 'text' in p,
            )?.text as string) || '';
          if (resultInputMessage === currentInputMessage) {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeout);

              // End message span on success
              if (this.telemetry && messageSpan && !messageEnded.current) {
                messageEnded.current = true;
                const messageDuration = Date.now() - conversationStartTime;
                this.telemetry.captureEvent({
                  name: AGENT_EVENTS.MESSAGE_PROCESSED,
                  attributes: {
                    'agent.conversation.id': this.conversationSlug,
                    'agent.message.duration_ms': String(messageDuration),
                  },
                });
                this.telemetry.endSpan(messageSpan, true);
              }

              try {
                const response = ctx.streamResult.toUIMessageStreamResponse({
                  onFinish: async ({
                    messages,
                    finishReason,
                  }: {
                    messages: UIMessage[];
                    finishReason?: FinishReason;
                  }) => {
                    if (finishReason === 'stop') {
                      this.factoryActor.send({
                        type: 'FINISH_STREAM',
                      });

                      // Get totalUsage from streamResult (it's a Promise)
                      const totalUsage = await ctx.streamResult.totalUsage;

                      // Create usage record
                      const usagePersistenceService =
                        new UsagePersistenceService(
                          this.repositories.usage,
                          this.repositories.conversation,
                          this.repositories.project,
                          this.conversationSlug,
                        );
                      usagePersistenceService
                        .persistUsage(totalUsage, ctx.model)
                        .catch((error) => {
                          console.error('Failed to persist usage:', error);
                        });
                    }

                    const messagePersistenceService =
                      new MessagePersistenceService(
                        this.repositories.message,
                        this.repositories.conversation,
                        this.conversationSlug,
                      );
                    messagePersistenceService.persistMessages(messages);

                    // End conversation span when stream finishes
                    if (this.telemetry && conversationSpan) {
                      const conversationDuration =
                        Date.now() - conversationStartTime;
                      this.telemetry.captureEvent({
                        name: AGENT_EVENTS.CONVERSATION_COMPLETED,
                        attributes: {
                          'agent.conversation.id': this.conversationSlug,
                          'agent.conversation.duration_ms':
                            String(conversationDuration),
                          'agent.conversation.status': 'success',
                        },
                      });
                      this.telemetry.endSpan(conversationSpan, true);
                    }
                  },
                });
                subscription.unsubscribe();
                resolve(response);
              } catch (err) {
                subscription.unsubscribe();

                // End spans on error
                if (this.telemetry && messageSpan && !messageEnded.current) {
                  messageEnded.current = true;
                  const messageDuration = Date.now() - conversationStartTime;
                  this.telemetry.captureEvent({
                    name: AGENT_EVENTS.MESSAGE_ERROR,
                    attributes: {
                      'agent.conversation.id': this.conversationSlug,
                      'error.message':
                        err instanceof Error ? err.message : String(err),
                      'agent.message.duration_ms': String(messageDuration),
                    },
                  });
                  this.telemetry.endSpan(messageSpan, false);
                }

                if (this.telemetry && conversationSpan) {
                  const conversationDuration =
                    Date.now() - conversationStartTime;
                  this.telemetry.captureEvent({
                    name: AGENT_EVENTS.CONVERSATION_ERROR,
                    attributes: {
                      'agent.conversation.id': this.conversationSlug,
                      'error.message':
                        err instanceof Error ? err.message : String(err),
                      'agent.conversation.duration_ms':
                        String(conversationDuration),
                    },
                  });
                  this.telemetry.endSpan(conversationSpan, false);
                }

                reject(err);
              }
            }
          }
          // If inputMessage doesn't match, it's a stale result - wait for the correct one
        }
      });

      const currentState = this.factoryActor.getSnapshot().value;
      const currentStateStr =
        typeof currentState === 'string'
          ? currentState
          : JSON.stringify(currentState);

      if (currentStateStr.includes('loadContext')) {
        // Wait for loadContext to complete before sending USER_INPUT
        const loadContextSubscription = this.factoryActor.subscribe((state) => {
          const stateValue = state.value;
          const stateStr =
            typeof stateValue === 'string'
              ? stateValue
              : JSON.stringify(stateValue);
          if (stateStr.includes('idle') || stateStr.includes('running')) {
            loadContextSubscription.unsubscribe();
            // Now send USER_INPUT within the message span context
            if (messageSpan) {
              context.with(trace.setSpan(context.active(), messageSpan), () => {
                sendUserInput();
              });
            } else {
              sendUserInput();
            }
          }
        });
      } else {
        // State machine is ready, send USER_INPUT immediately within message span context
        if (messageSpan) {
          context.with(trace.setSpan(context.active(), messageSpan), () => {
            sendUserInput();
          });
        } else {
          sendUserInput();
        }
      }
    });
  }
}
