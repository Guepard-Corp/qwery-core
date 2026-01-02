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
import { sanitizeMessages } from './utils/message-utils';

export interface FactoryAgentOptions {
  conversationSlug: string;
  model: string;
  repositories: Repositories;
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

  constructor(opts: FactoryAgentOptions & { conversationId: string }) {
    this.id = nanoid();
    this.conversationSlug = opts.conversationSlug;
    this.conversationId = opts.conversationId;
    this.repositories = opts.repositories;
    this.model = opts.model;
    console.log(`[FactoryAgent ${this.id}] Initializing with model: ${this.model}`);
    this.actorRegistry = new ActorRegistry();
    console.log(`[FactoryAgent ${this.id}] ActorRegistry created.`);

    // Create queryEngine before state machine so it can be passed
    try {
      this.queryEngine = createQueryEngine(DuckDBQueryEngine);
      console.log(`[FactoryAgent ${this.id}] QueryEngine created.`);
    } catch (e) {
      console.error(`[FactoryAgent ${this.id}] Failed to create QueryEngine:`, e);
      throw e;
    }

    this.lifecycle = createStateMachine(
      this.conversationId,
      this.conversationSlug,
      this.model,
      this.repositories,
      this.queryEngine,
    );
    console.log(`[FactoryAgent ${this.id}] State machine created.`);

    this.factoryActor = createActor(
      this.lifecycle as ReturnType<typeof createStateMachine>,
    );
    console.log(`[FactoryAgent ${this.id}] Factory actor created.`);

    // Register main factory actor
    this.actorRegistry.register('factory', this.factoryActor);

    // NEW: Persist state on changes
    this.factoryActor.subscribe((state) => {
      console.log(`###Factory [${this.id}] state:`, state.value);
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
    console.log(`[FactoryAgent ${this.id}] Initialized and started.`);
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

    // Wait for the agent to be in idle state before processing messages
    const currentState = this.factoryActor.getSnapshot().value;
    console.log(`[FactoryAgent ${this.id}] Current state: ${currentState}`);
    if (currentState !== 'idle' && String(currentState) !== 'idle') {
      console.log(`[FactoryAgent ${this.id}] Waiting for idle state...`);
      // Wait for the state machine to reach idle
      await new Promise<void>((resolve) => {
        const subscription = this.factoryActor.subscribe((state) => {
          if (state.value === 'idle' || String(state.value) === 'idle') {
            console.log(`[FactoryAgent ${this.id}] Finally reached idle state!`);
            subscription.unsubscribe();
            resolve();
          }
        });
      });
    }

    // Sanitize messages: filter out empty parts which cause validation errors in AI SDK v5
    const sanitizedMessages = sanitizeMessages(opts.messages);

    // Get the current input message to track which request this is for
    const lastMessage = sanitizedMessages[sanitizedMessages.length - 1];

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

    //console.log("Last user text:", JSON.stringify(opts.messages, null, 2));

    return await new Promise<Response>((resolve, reject) => {
      let resolved = false;
      let requestStarted = false;
      let lastState: string | undefined;
      let stateChangeCount = 0;
      let subscription: any;

      const timeout = setTimeout(() => {
        if (!resolved) {
          if (subscription) subscription.unsubscribe();
          reject(
            new Error(
              `FactoryAgent response timeout: state machine did not produce streamResult within 30 seconds. Last state: ${lastState}, state changes: ${stateChangeCount}`,
            ),
          );
        }
      }, 30000);

      let userInputSent = false;

      const sendUserInput = () => {
        if (!userInputSent) {
          userInputSent = true;
          console.log(
            `[FactoryAgent ${this.id}] Sending USER_INPUT event with message: "${currentInputMessage}"`,
          );
          this.factoryActor.send({
            type: 'USER_INPUT',
            messages: sanitizedMessages,
          });
          console.log(
            `[FactoryAgent ${this.id}] USER_INPUT sent, current state:`,
            this.factoryActor.getSnapshot().value,
          );
        }
      };

      subscription = this.factoryActor.subscribe((state) => {
        const ctx = state.context;
        const currentState =
          typeof state.value === 'string'
            ? state.value
            : JSON.stringify(state.value);
        lastState = currentState;
        stateChangeCount++;

        // Detailed debug logging for EVERY state transition
        console.log(
          `[FactoryAgent ${this.id}] State: ${currentState}, Changes: ${stateChangeCount}, HasResult: ${!!ctx.streamResult}, Error: ${ctx.error || 'none'}`
        );

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
          if (resultInputMessage === currentInputMessage) {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeout);
              try {
                const response = ctx.streamResult.toUIMessageStreamResponse({
                  // Generate server-side UUIDs for message persistence
                  // This ensures consistent IDs across sessions and prevents UUID format errors
                  generateMessageId: () => uuidv4(),
                  onFinish: async ({
                    messages,
                    finishReason,
                  }: {
                    messages: UIMessage[];
                    finishReason?: FinishReason;
                  }) => {
                    console.log(`[FactoryAgent ${this.id}] Stream finished with reason: ${finishReason}`);

                    // CRITICAL: Always signal completion to the state machine
                    // If we don't do this, the agent stays in 'streaming' state
                    // and subsequent requests wait until they time out (30s)
                    this.factoryActor.send({
                      type: 'FINISH_STREAM',
                    });

                    if (finishReason === 'stop') {
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
                        // Note: Errors are logged but response already sent to client
                        // In future, could send error notification via separate channel
                      }
                    } catch (error) {
                      console.warn(
                        `Failed to persist messages for conversation ${this.conversationSlug}:`,
                        error instanceof Error ? error.message : String(error),
                      );
                    }
                  },
                });
                console.log(`[FactoryAgent ${this.id}] Resolving respond promise with Response object`);
                subscription.unsubscribe();
                resolve(response);
              } catch (err) {
                subscription.unsubscribe();
                reject(err);
              }
            }
          }
          // If inputMessage doesn't match, it's a stale result - wait for the correct one
        }
      });

      // Rely on the subscription above to send USER_INPUT when the machine transitions to idle
      // or if it's already idle.
      const startState = this.factoryActor.getSnapshot().value;
      if (startState === 'idle' || String(startState).includes('idle')) {
        sendUserInput();
      } else {
        console.log(`[FactoryAgent ${this.id}] Waiting for idle state to send USER_INPUT. Current: ${startState}`);
      }
    });
  }

  /**
   * Stop the agent and all its actors.
   * This should be called on page refresh/unmount to cancel ongoing processing.
   */
  stop(): void {
    const snapshot = this.factoryActor.getSnapshot();
    if (!snapshot) return;

    const currentState = snapshot.value;

    if (currentState !== 'idle' && currentState !== 'stopped') {
      this.factoryActor.send({ type: 'STOP' });
    }

    this.actorRegistry.stopAll();

    this.factoryActor.stop();
  }
}
