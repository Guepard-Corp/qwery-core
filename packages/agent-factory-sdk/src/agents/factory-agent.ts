import { FinishReason, UIMessage } from 'ai';
import { createActor } from 'xstate';
import { nanoid } from 'nanoid';
import { createStateMachine } from './state-machine';
import { Repositories } from '@qwery/domain/repositories';
import { MessagePersistenceService } from '../services/message-persistence.service';
import { ActorRegistry } from './utils/actor-registry';
import { persistState } from './utils/state-persistence';

export interface FactoryAgentOptions {
  conversationSlug: string;
  repositories: Repositories;
}

export class FactoryAgent {
  readonly id: string;
  private readonly conversationSlug: string;
  private lifecycle: ReturnType<typeof createStateMachine>;
  private factoryActor: ReturnType<typeof createActor>;
  private repositories: Repositories;
  private actorRegistry: ActorRegistry; // NEW: Actor registry

  constructor(opts: FactoryAgentOptions) {
    this.id = nanoid();
    this.conversationSlug = opts.conversationSlug;
    this.repositories = opts.repositories;
    this.actorRegistry = new ActorRegistry(); // NEW

    this.lifecycle = createStateMachine(
      this.conversationSlug,
      this.repositories,
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

    //console.log("Last user text:", JSON.stringify(opts.messages, null, 2));

    return await new Promise<Response>((resolve, reject) => {
      let resolved = false;
      let requestStarted = false;
      let lastState: string | undefined;
      let stateChangeCount = 0;

      const timeout = setTimeout(() => {
        if (!resolved) {
          subscription.unsubscribe();
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
                    }

                    const messagePersistenceService =
                      new MessagePersistenceService(
                        this.repositories.message,
                        this.repositories.conversation,
                        this.conversationSlug,
                      );
                    messagePersistenceService.persistMessages(messages);
                  },
                });
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

      // Check if we're already in idle state, if so send USER_INPUT immediately
      const currentState = this.factoryActor.getSnapshot().value;
      if (currentState === 'idle') {
        sendUserInput();
      }
      // Otherwise, the subscription handler will send USER_INPUT when state reaches idle
    });
  }
}
