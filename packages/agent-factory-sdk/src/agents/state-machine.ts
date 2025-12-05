import { setup, assign } from 'xstate';
import { AgentContext, AgentEvents } from './types';
import {
  detectIntentActor,
  summarizeIntentActor,
  greetingActor,
  readDataAgentActor,
  loadContextActor,
} from './actors';
import { Repositories } from '@qwery/domain/repositories';
import { createCachedActor } from './utils/actor-cache';

export const createStateMachine = (
  conversationId: string,
  repositories: Repositories,
) => {
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

      // NEW: Check if should retry
      shouldRetry: ({ context }) => {
        const retryCount = context.retryCount || 0;
        return retryCount < 3; // Max 3 retries
      },

      // NEW: Check if retry limit exceeded
      retryLimitExceeded: ({ context }) => {
        const retryCount = context.retryCount || 0;
        return retryCount >= 3;
      },
    },
    delays: {
      // NEW: Exponential backoff delays
      retryDelay: ({ context }) => {
        const retryCount = context.retryCount || 0;
        return Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
      },
    },
  });
  return defaultSetup.createMachine({
    /** @xstate-layout N4IgpgJg5mDOIC5QDMCGBjALgewE4E8BaVGAO0wDoAbbVCAYW3LAA9MBiCJsCgS1IBu2ANY8AMgHkAggBEA+vQkA5ACoBRABoqA2gAYAuolAAHbLF6ZeTIyBaIALLoBsFAIwAOAOwBWVwGZvAE5dP3dXbwAaEHxEACZXVwp7QJSnFMD3b1inAF8cqLQsPCISMHJqWgYmTFYOMFxcPApjKlRMZDwAWwpJWQVldS09QyQQU3NLa1G7BFcnDwpdcO80gMD7Tz8omIQ-XXsKQO89wPiw-bC8gowcAmIySl4IKjB2AFUAZTUAJTkASSUAAU3joDDZxhYrKQbDMsttEGEkulPJ40u57LENlcQIVbiUHnxnq8PioJIDhuCzJCpqAZq4MroKE4-LEfO5dO5Yt4QoF4QgVozHE4uX5AgFHCtsbjivcypRcABXUikfhQd5fX4A4GgkYmKmTaHTRA+A6eU5i1w+MUs+x8lmBCiebK+eJOTy6WLiqU3GWlcqK5Wq9gkskU0YQg0wxBzUKLZarIIbLbRByZQ6xQLuj3uQL+J25fI4n13P3ypUq0hQCgQMA1LB-ZjkTjcPiCEQ8ADiahU-1UalUYb1EyhUYQ9iCcZWrmSTk5GycfOF7gosRCHO8ni8flcHu9RRLBIDFarNbrmAbNSbXFIPH4QlEFC7PYB6gHrl1Y31I6NY4nSynM5zqifKZsu7icps9hOPMHh+H4e54rK-rlqq1a1mA9aNhw163m2D5Pr2r46LEH4Rt+tIOH+4TzIBmLASmCCePYfgriEHhLKiHK6IECG+oeKGVmhZ4XnK7D1I0uDNK07RdI+3aEf2OqUsONK2NGzLLv+Kxiommx8scLgYoEs7HCk4QeLxB5yhQR6obACqdJ0qC4LwABeYAiVeLZ3u2FAfG8ACyAVSN8fwAFpqApA5guGX6qXSq7eEy3GhNBYS+Byi7jky9IotOPiopsln4tZtmCfZjnOW5HlYWJDRNC0bQdLg3T+UFIXhZFL6KYOn4qYaFGzEuk7aWsSaLhmFDgbE7JsnMmw8YW0pWchgaCVAuBgLWQY4a2948B8UhiG8ai9WR8XRolyViu4aXmZlDGZIywTCt4UEZAE9LFUhZZrVWG1bZYlZ1RJUlNbJh3HadMVDtSA1qUNCxaQm6x6QxKQsf4rLBGxXhON432ljZAlVptdAyG0qDNjee2+d8ah9DIUgqFIZ1xfDCW6ElTgpbds73e4fIFUkxwcjuughBu7iE-xf02WA5OUyDDXSc13T04zzOszDfVw6OcxI-GOmo8mOxOixcFBBmqL2PSBbXPuJWrceFCwJgZOdEGABiAJ-B8AAScgkhrAVs-1+vzJpRtjWjOxhC4m65iEUHxME8HYqQ2A1vAozLU7mDKXrP62gxhD20Wjs-RUdCMMwbCF5GP5wgxsSYiuzoSr4czgTL1lPC8DfkQjHiZm4LL5vYGLzKE+k84czgijpEqeL3zuqoPF38ryDFZA6brGTmoRmu4oqr79Lunhh55YRvHPRronggb4jopWuXMJItDuIUTZVVhVTkuXcp5AusVw4-jNHvFKuYeahCgq4Rclo3BmjSDNSe04oJn2JnLAG21Ky31HOBRIfgfBc2YjmRwyQQIogoGsE46xxyWkwb-eWitMCoHwT+E+mNOQZm8GET03Eha2yZMgrIGJ0TulcEwkmrt3YK09ng0BRdBroJcAvSeGZyFMUfgxFEDojIblbsyRw25MFu2wMYYwkAOGDVXOiRY7ptwvXWHwyIO8Jz42FNuCWrJPR5DyEAA */
    id: 'factory-agent',
    context: {
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
                // NEW: Timeout
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
                // NEW: Wait for exponential backoff delay
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
            type: 'parallel', // NEW: Enable parallel execution
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
