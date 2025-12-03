import { FinishReason, UIMessage } from 'ai';
import { createActor } from 'xstate';
import { nanoid } from 'nanoid';
import { createStateMachine } from './state-machine';
import { Repositories } from '@qwery/domain/repositories';
import { MessagePersistenceService } from '../services/message-persistence.service';

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

  constructor(opts: FactoryAgentOptions) {
    this.id = nanoid();
    this.conversationSlug = opts.conversationSlug;
    this.repositories = opts.repositories;

    this.lifecycle = createStateMachine(
      this.conversationSlug,
      this.repositories,
    );

    this.factoryActor = createActor(
      this.lifecycle as ReturnType<typeof createStateMachine>,
    );

    this.factoryActor.subscribe((state) => {
      console.log('###Factory state:', state.value);
    });

    this.factoryActor.start();
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

      const subscription = this.factoryActor.subscribe((state) => {
        const ctx = state.context;
        const currentState =
          typeof state.value === 'string'
            ? state.value
            : JSON.stringify(state.value);
        lastState = currentState;
        stateChangeCount++;

        // Check for errors in context
        if (ctx.error) {
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
            `FactoryAgent ${this.id} appears stuck in detectIntent; waiting for state change...`,
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

      // Kick off the state transition and LLM call
      // The state machine will clear any previous streamResult when USER_INPUT is received
      this.factoryActor.send({
        type: 'USER_INPUT',
        messages: opts.messages,
      });
    });
  }
}
