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
    },
  });
  return defaultSetup.createMachine({
    /** @xstate-layout N4IgpgJg5mDOIC5QDMCGBjALgewE4E8BaVGAO0wDoAbbVCAYW3LAA9MBiCJsCgS1IBu2ANY8AMgHkAggBEA+vQkA5ACoBRABoqA2gAYAuolAAHbLF6ZeTIyBaIALLoBsFAIxOPAVgDMADm+eugDsQa4ANCD4iK5BLp5Bvq4BTq723gCcPvYAvtkRaFh4RCRg5NS0DEyYrBxguLh4FMZUqJjIeAC2FJKyCsrqWnqGSCCm5pbWI3YIji7uXn4BwaERUQgATE6+FL7rnp6u6Sn2IYm5+Rg4BMRklLwQVGDsAKoAymoASnIAkkoACs8dAYbGMLFZSDZpp51qtEIkKN51ut0utdPYFgdPOcQAUrsVbnwHk9XioJH8hiCzGDJqBpu57K4KOldL4nOkAidvGjYTN4Y4gvZfIF9hkMtjcUUbqVKLgAK6kUj8KAvd5fX4AoHDExUiYQqaITweCi6fbpUKuVmpbw8vxBY3rbwWoLBda+U7iy6SkplOUKpXsElkikjUG6yHRdb2dI7TEMzZBTKeXw21yeChOLkxXSpdL2dZBbwewrXb0y+WK0hQCgQMDVLDfZjkTjcPiCEQ8ADiahUP1UalUwe143B4ZmnmjuhNMUcvjR3jSPK29nTh3RqTdnnsaSLeKlPvLSurtbA9cbHC4pB4-CEogoXZ7v3UA9cWtGOpH+rHE6nApZc4XkSIAm0YMq4WaoiEaTpDuXoEr6FZVjWdaYA21RNheV5tre969k+OjrK+oYfrSDjjsaP4zv+1qAQgzLLqEaJRm66yHOOMElnBB6VkeyGodK7B1A0uBNC0bSdHe3a4f2mqUsONK2BGZFCqmcZOAm+zJjR3hOGmW6bCcRy6CxSLsfi0oUPBh6wLKHQdKguC8AAXmAfHoS217thQrzPAAsj5UgfN8ABaahSQOwIhu+8l0ps0bKZurjxommlrPY8TpsyuiOoZ46CkEpl7mWfrcdZtn2U5LlngJ9SNM0rTtLgXTeX5AXBaFj7SYOb5yXqJEIIlCYxipiVqclPKbtG7ICqmhlmiEBWlhZXFVlAuBgLW-oYa2N48K8UhiM8ahdUR0URr4cWxiN6lJoueZuL4BnpEcSROM4C2ccVK1rRtlbVUJIn1eJe0HUdEVDtSvUKf1yIXcNSUaTyBbLmkSJ+O4Jr6e95mWdxa10DIrSoM2l7bZ5HxqL0MhSCoUjHVFkMxU9Q0JfDN00bsLijfE8RorOuZY-un0WWA+OE39tWiQ1XTk5T1O02D3UQ6OiUZMzqnXSliDpBaTL5tmGRZWa0K5HkICkNgNbwCMEocdKslK5+9g8oQLiTm77vuyxAuUDQdCMMwbD22Gn7QjySJxSk0LuAcQQw4Wps22ZZT3I8QfEVDqZJhQmyZg6+aRtRqXwoa52RscKQCk43tLZ9aenQg448uidqhA9r3zrMiLVzjiHHqeaGYHXDPRME437MaDJ+CyrgmukD3d8tFClXZDnOa5g+RT1o4JtsG7Zs6uYBAmi4Fm42abA9vgPcy6wL0Lq3rZYlZD6OV+6Om3gH2l7KikEiNmgiIUugURbHiE4PMd8ELC1FpgVAL9Pz+HWBQPSscwJBGhIETWtEjLpgeicLYsQtxvQTp6W2ZRYA4GMMYSA8C+rTmXDpCuDIvApCbrOBEewtxHASE4MuOQTZAA */
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
            invoke: {
              src: 'detectIntentActor',
              id: 'GET_INTENT',
              input: ({ context }: { context: AgentContext }) => ({
                inputMessage: context.inputMessage,
              }),
              onDone: [
                {
                  guard: 'isOther',
                  target: 'summarizeIntent',
                  actions: assign({
                    intent: ({ event }) => event.output,
                  }),
                },
                {
                  guard: 'isGreeting',
                  target: 'greeting',
                  actions: assign({
                    intent: ({ event }) => event.output,
                  }),
                },
                {
                  guard: 'isReadData',
                  target: 'readData',
                  actions: assign({
                    intent: ({ event }) => event.output,
                  }),
                },
              ],
              onError: {
                target: '#factory-agent.idle',
                actions: assign({
                  error: ({ event }) => {
                    const errorMsg =
                      event.error instanceof Error
                        ? event.error.message
                        : String(event.error);
                    console.error('detectIntent error:', errorMsg, event.error);
                    return errorMsg;
                  },
                  streamResult: undefined,
                }),
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
                target: '#factory-agent.idle',
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
                target: '#factory-agent.idle',
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
            invoke: {
              src: 'readDataAgentActor',
              id: 'READ_DATA',
              input: ({ context }: { context: AgentContext }) => ({
                inputMessage: context.inputMessage,
                conversationId: context.conversationId,
                previousMessages: context.previousMessages,
              }),
              onDone: {
                target: '#factory-agent.idle',
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
                    console.error('readData error:', errorMsg, event.error);
                    return errorMsg;
                  },
                  streamResult: undefined,
                }),
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
