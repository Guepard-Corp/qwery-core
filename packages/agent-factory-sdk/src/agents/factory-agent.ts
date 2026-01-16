import { FinishReason, UIMessage } from 'ai';
import { createActor } from 'xstate';
import { nanoid } from 'nanoid';
import { v4 as uuidv4 } from 'uuid';
import { createStateMachine } from './state-machine';
import { Repositories } from '@qwery/domain/repositories';
import { ActorRegistry } from './utils/actor-registry';
import { persistState } from './utils/state-persistence';
import {
  UsagePersistenceService,
  MessagePersistenceService,
  DuckDBQueryEngine,
} from '../services';
import { createQueryEngine, AbstractQueryEngine } from '@qwery/domain/ports';
import type { TelemetryManager } from '@qwery/telemetry/otel';
import {
  createNullTelemetryService,
  createConversationAttributes,
  createMessageAttributes,
  endMessageSpanWithEvent,
  endConversationSpanWithEvent,
} from '@qwery/telemetry/otel';
import { AGENT_EVENTS } from '@qwery/telemetry/events/agent.events';
import { context, trace, type SpanContext } from '@opentelemetry/api';

export interface FactoryAgentOptions {
  conversationSlug: string;
  model: string;
  repositories: Repositories;
  telemetry?: TelemetryManager;
}

export class FactoryAgent {
  readonly id: string;
  private readonly conversationSlug: string;
  private readonly conversationId: string;
  private lifecycle: ReturnType<typeof createStateMachine>;
  private factoryActor: ReturnType<typeof createActor>;
  private repositories: Repositories;
  private actorRegistry: ActorRegistry; // NEW: Actor registry
  private model: string;
  private queryEngine: AbstractQueryEngine;
  private readonly telemetry: TelemetryManager;
  // Store parent span contexts for linking actor spans
  private parentSpanContexts:
    | Array<{
        context: SpanContext;
        attributes?: Record<string, string | number | boolean>;
      }>
    | undefined;
  // Store loadContext span reference to add links later
  private loadContextSpan:
    | ReturnType<TelemetryManager['startSpan']>
    | undefined;

  constructor(opts: FactoryAgentOptions & { conversationId: string }) {
    this.id = nanoid();
    this.conversationSlug = opts.conversationSlug;
    this.conversationId = opts.conversationId;
    this.repositories = opts.repositories;
    this.actorRegistry = new ActorRegistry(); // NEW
    this.model = opts.model;
    this.telemetry = (opts.telemetry ??
      createNullTelemetryService()) as TelemetryManager;

    // Create queryEngine before state machine so it can be passed
    this.queryEngine = createQueryEngine(DuckDBQueryEngine);

    this.lifecycle = createStateMachine(
      this.conversationId, // UUID (for internal tracking)
      this.conversationSlug, // Slug (for readDataAgent)
      this.model,
      this.repositories,
      this.queryEngine, // Pass queryEngine to state machine
      this.telemetry,
      () => this.parentSpanContexts, // Function to get current parent span contexts
      (span: ReturnType<TelemetryManager['startSpan']>) => {
        this.loadContextSpan = span;
      }, // Callback to store loadContext span
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

  static async create(opts: FactoryAgentOptions): Promise<FactoryAgent> {
    const conversation = await opts.repositories.conversation.findBySlug(
      opts.conversationSlug,
    );
    if (!conversation) {
      throw new Error(
        `Conversation with slug '${opts.conversationSlug}' not found`,
      );
    }

    return new FactoryAgent({
      ...opts,
      conversationId: conversation.id,
    });
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

    const currentState = this.factoryActor.getSnapshot().value;
    if (currentState !== 'idle') {
      await new Promise<void>((resolve) => {
        const subscription = this.factoryActor.subscribe((state) => {
          if (state.value === 'idle') {
            subscription.unsubscribe();
            resolve();
          }
        });
      });
    }

    // Start conversation span
    const conversationAttrs = createConversationAttributes(
      this.conversationSlug,
      this.id,
      opts.messages.length,
    );
    const conversationSpan = this.telemetry.startSpan(
      'agent.conversation',
      conversationAttrs as unknown as Record<string, unknown>,
    );

    this.telemetry.captureEvent({
      name: AGENT_EVENTS.CONVERSATION_STARTED,
      attributes: conversationAttrs as unknown as Record<string, unknown>,
    });

    // Get the current input message to track which request this is for
    const lastMessage = opts.messages[opts.messages.length - 1];

    // Persist latest user message (non-blocking, errors collected but don't block response)
    const messagePersistenceService = new MessagePersistenceService(
      this.repositories.message,
      this.repositories.conversation,
      this.conversationSlug,
    );

    const persistenceErrors: Error[] = [];

    messagePersistenceService
      .persistMessages([lastMessage as UIMessage])
      .then((result) => {
        if (result.errors.length > 0) {
          persistenceErrors.push(...result.errors);
          console.warn(
            `Failed to persist user message for conversation ${this.conversationSlug}:`,
            result.errors.map((e) => e.message).join(', '),
          );
        }
      })
      .catch((error) => {
        persistenceErrors.push(
          error instanceof Error ? error : new Error(String(error)),
        );
        console.warn(
          `Failed to persist message for conversation ${this.conversationSlug}:`,
          error instanceof Error ? error.message : String(error),
        );
      });

    const textPart = lastMessage?.parts.find((p) => p.type === 'text');
    const currentInputMessage =
      textPart && 'text' in textPart ? (textPart.text as string) : '';

    // Start message span
    const messageAttrs = createMessageAttributes(
      this.conversationSlug,
      currentInputMessage,
      opts.messages.length - 1,
      'user',
    );
    const messageSpan = this.telemetry.startSpan(
      'agent.message',
      messageAttrs as unknown as Record<string, unknown>,
    );

    // Capture parent span contexts for linking actor spans
    if (conversationSpan && messageSpan) {
      this.parentSpanContexts = [
        {
          context: conversationSpan.spanContext(),
          attributes: {
            'agent.span.type': 'conversation',
            'agent.conversation.id': this.conversationSlug,
          },
        },
        {
          context: messageSpan.spanContext(),
          attributes: {
            'agent.span.type': 'message',
            'agent.conversation.id': this.conversationSlug,
          },
        },
      ];

      // Add links to loadContext span if it exists and is still recording
      if (this.loadContextSpan && this.loadContextSpan.isRecording()) {
        this.loadContextSpan.addLinks([
          {
            context: conversationSpan.spanContext(),
            attributes: {
              'agent.span.type': 'conversation',
              'agent.conversation.id': this.conversationSlug,
            },
          },
          {
            context: messageSpan.spanContext(),
            attributes: {
              'agent.span.type': 'message',
              'agent.conversation.id': this.conversationSlug,
            },
          },
        ]);
      }
    } else {
      this.parentSpanContexts = undefined;
    }

    this.telemetry.captureEvent({
      name: AGENT_EVENTS.MESSAGE_RECEIVED,
      attributes: messageAttrs as unknown as Record<string, unknown>,
    });

    const conversationStartTime = Date.now();
    const messageEnded = { current: false };

    return await new Promise<Response>((resolve, reject) => {
      let resolved = false;
      let requestStarted = false;
      let lastState: string | undefined;
      let stateChangeCount = 0;

      const timeout = setTimeout(() => {
        if (!resolved) {
          subscription.unsubscribe();

          if (messageSpan && messageSpan.isRecording()) {
            messageEnded.current = true;
            endMessageSpanWithEvent(
              this.telemetry,
              messageSpan,
              this.conversationSlug,
              conversationStartTime,
              false,
              'Response timeout',
            );
          }

          if (conversationSpan && conversationSpan.isRecording()) {
            endConversationSpanWithEvent(
              this.telemetry,
              conversationSpan,
              this.conversationSlug,
              conversationStartTime,
              false,
              `Response timeout: Last state: ${lastState}, state changes: ${stateChangeCount}`,
            );
          }

          reject(
            new Error(
              `FactoryAgent response timeout: state machine did not produce streamResult within 60 seconds. Last state: ${lastState}, state changes: ${stateChangeCount}`,
            ),
          );
        }
      }, 60000);

      let userInputSent = false;

      const sendUserInput = () => {
        if (!userInputSent) {
          userInputSent = true;
          if (conversationSpan && messageSpan) {
            context.with(
              trace.setSpan(context.active(), conversationSpan),
              () => {
                context.with(
                  trace.setSpan(context.active(), messageSpan),
                  () => {
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
                  },
                );
              },
            );
          } else {
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

        if (
          stateChangeCount <= 5 ||
          currentState.includes('detectIntent') ||
          currentState.includes('greeting')
        ) {
          console.log(
            `[FactoryAgent ${this.id}] State: ${currentState}, Changes: ${stateChangeCount}, HasError: ${!!ctx.error}, HasStreamResult: ${!!ctx.streamResult}`,
          );
        }

        if (currentState === 'idle' && !userInputSent) {
          sendUserInput();
          return;
        }

        if (ctx.error) {
          console.error(
            `[FactoryAgent ${this.id}] Error in context:`,
            ctx.error,
          );
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            subscription.unsubscribe();

            if (
              messageSpan &&
              messageSpan.isRecording() &&
              !messageEnded.current
            ) {
              messageEnded.current = true;
              endMessageSpanWithEvent(
                this.telemetry,
                messageSpan,
                this.conversationSlug,
                conversationStartTime,
                false,
                ctx.error,
              );
            }

            if (conversationSpan && conversationSpan.isRecording()) {
              endConversationSpanWithEvent(
                this.telemetry,
                conversationSpan,
                this.conversationSlug,
                conversationStartTime,
                false,
                ctx.error,
              );
            }

            reject(new Error(`State machine error: ${ctx.error}`));
          }
          return;
        }

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

            if (
              messageSpan &&
              messageSpan.isRecording() &&
              !messageEnded.current
            ) {
              messageEnded.current = true;
              endMessageSpanWithEvent(
                this.telemetry,
                messageSpan,
                this.conversationSlug,
                conversationStartTime,
                false,
                ctx.error,
              );
            }

            if (conversationSpan && conversationSpan.isRecording()) {
              endConversationSpanWithEvent(
                this.telemetry,
                conversationSpan,
                this.conversationSlug,
                conversationStartTime,
                false,
                ctx.error,
              );
            }

            reject(new Error(`State machine error: ${ctx.error}`));
          }
          return;
        }

        if (currentState.includes('detectIntent') && stateChangeCount > 10) {
          console.warn(
            `[FactoryAgent ${this.id}] Appears stuck in detectIntent after ${stateChangeCount} state changes`,
          );
          return;
        }

        if (state.value === 'running' || ctx.streamResult) {
          requestStarted = true;
        }

        // When the state machine has produced the StreamTextResult, verify it's for the current request
        if (ctx.streamResult && requestStarted) {
          const resultInputMessage = ctx.inputMessage;
          if (resultInputMessage === currentInputMessage) {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeout);

              if (
                messageSpan &&
                messageSpan.isRecording() &&
                !messageEnded.current
              ) {
                messageEnded.current = true;
                endMessageSpanWithEvent(
                  this.telemetry,
                  messageSpan,
                  this.conversationSlug,
                  conversationStartTime,
                  true,
                );
              }

              try {
                const response = ctx.streamResult.toUIMessageStreamResponse({
                  generateMessageId: () => uuidv4(),
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

                      const totalUsage = await ctx.streamResult.totalUsage;

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
                    try {
                      const result =
                        await messagePersistenceService.persistMessages(
                          messages,
                        );
                      if (result.errors.length > 0) {
                        console.warn(
                          `Failed to persist some assistant messages for conversation ${this.conversationSlug}:`,
                          result.errors.map((e) => e.message).join(', '),
                        );
                      }
                    } catch (error) {
                      console.warn(
                        `Failed to persist messages for conversation ${this.conversationSlug}:`,
                        error instanceof Error ? error.message : String(error),
                      );
                    }

                    if (conversationSpan && conversationSpan.isRecording()) {
                      endConversationSpanWithEvent(
                        this.telemetry,
                        conversationSpan,
                        this.conversationSlug,
                        conversationStartTime,
                        true,
                      );
                    }
                  },
                });
                subscription.unsubscribe();
                resolve(response);
              } catch (err) {
                subscription.unsubscribe();

                // End spans on error
                if (
                  messageSpan &&
                  messageSpan.isRecording() &&
                  !messageEnded.current
                ) {
                  messageEnded.current = true;
                  endMessageSpanWithEvent(
                    this.telemetry,
                    messageSpan,
                    this.conversationSlug,
                    conversationStartTime,
                    false,
                    err instanceof Error ? err.message : String(err),
                  );
                }

                if (conversationSpan && conversationSpan.isRecording()) {
                  endConversationSpanWithEvent(
                    this.telemetry,
                    conversationSpan,
                    this.conversationSlug,
                    conversationStartTime,
                    false,
                    err instanceof Error ? err.message : String(err),
                  );
                }

                reject(err);
              }
            }
          }
        }
      });

      sendUserInput();
    });
  }

  /**
   * Stop the agent and all its actors.
   * This should be called on page refresh/unmount to cancel ongoing processing.
   */
  stop(): void {
    const currentState = this.factoryActor.getSnapshot().value;

    if (currentState !== 'idle' && currentState !== 'stopped') {
      this.factoryActor.send({ type: 'STOP' });
    }

    this.actorRegistry.stopAll();

    this.factoryActor.stop();
  }
}
