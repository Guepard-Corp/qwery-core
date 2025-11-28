import { setup, assign } from 'xstate';
import { AgentContext, AgentEvents } from './types';
import {
  detectIntentActor,
  summarizeIntentActor,
  greetingActor,
  readDataAgentActor,
} from './actors';

export const createStateMachine = (conversationId: string) => {
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
    /** @xstate-layout N4IgpgJg5mDOIC5QDMCGBjALgewE4E8BaVGAO0wDoBLCAGzAGIBVAZQFEAlAfQEkA5AApMAKgG0ADAF1EoAA7ZYVTFWykZIAB6IArACYANCHyIAHAEYKAZl26AnGYDsN87dsA2SwF9PhtFjxEJGDk1HSMLMIA8gIS0kgg8orKqupaCGbaDpYUutri+Za2ACzi2m66DobGCIXaFA5mum7aJm62JjYV2t6+GDgExGSUuACupKRUpFAMEdGx6olKKmrxaY3ithQm2hnalq264kUeVYiHddtm7kUmlkU32w49IH79gUMUo+OTUBQQYJgwFgeORgpgGBBVGBqKQAG7YADW0IA4mxhLw+MI2Jj5vFFskVqA0kVChR8nozEUHB5HAYjIgihl6vY3A5xJY3EVtPdbM9XgFBmDPmMJlM-gCgZgQYDyBCoTD4UiKKj0fwsTizHE5AolilVgzSeTdJTqZZaacEHtxBQWpYzSZjrZMiYnj4Xn0BUEQl9Rb9-oDgaDZZDSNDJoqUWiMeqxLotQkdQTUgbNkaTTSnBaPBcOtSmq12fY+R6Bl7hiKfuKA1Kg+CwLhcHgKLJaKhMMg8ABbZVRtXYsRSBaJ5bJ9LGzaXbR7A5HE70hC5OpuTnHNyNY7iNytYv+UsfH2V2AjTud1C4KgALzA0rBctDCsR0JYTAAsi+AIIcHgALTY0f7uLakkI76mOVxbDsU77OUs6WBaljiLoFCOhks5tLYWTdG6-J7kKB5ikeJ5npe161gw9aNrgzatu2XYUM+b6fj+f59jig54sOepEogjTgZO04wcccHzoURT1GYzQ3FJrQmLy2Elu8eEVmKUC4GAAI-HeYZwo+9HvgAMkwbCAQmwFcZoPHjhBuzQYcQkWvcFgUro1i5rkxQ7m8grespvyqepyhTORDZNi2bYdrg3YsAZRkmfiIHcWBE6QQJdlztUezZNSrQIQ6OwIXJvS7opPnfGKamoBAAAibaoFpD5KhwbDvlVXBVe+wjvnFnGEhZSXWVBM72fOLTWpkdoZGYLoUlhRVeWWwplb8FXVbVwWUdR4V0U1LVtR1XXsUBuq9WshzJTZQ3pYgrJIR04gNLJUGbmY3huqQ2D-PA8Q4SVmBDmZJ2IIQtgWoQbieZ6Hw0PQ-3HaOlKyRQbhHJSRz7NyZjwU6WwOIy7LmJSjISRDuGlb6sNJqBhTwRJFBOqULkVJYFIk79i2+lWko3uQFMJX1LpZuIJg5MuLoOJkNglK6c2Q0pS0UIRp7nle3N-RxAOjg4DjC9N4hmNY5R2maDlHDkWQklN2V5IV7rFd55by-5GlTLz5lpAWSOWA0douZSrLaBaejC1OWSbi6etmJurP2+zlYrTVmCoK7gMIOYSH3BURMmiY91ZnaEE3TnrT2Lc0cLbAOCyLIkDJ-D-t0xhjL3M0tg2FjYkeJuQu2EcewVK9nhAA */
    id: 'factory-agent',
    context: {
      inputMessage: '',
      conversationId: conversationId,
      response: '',
      uiMessages: [],
      streamResult: undefined,
      intent: {
        intent: 'other',
        complexity: 'simple',
      },
      error: undefined,
    },
    initial: 'idle',
    states: {
      idle: {
        on: {
          USER_INPUT: {
            target: 'running',
            actions: assign({
              uiMessages: ({ event }) => event.messages,
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
              uiMessages: ({ event }) => event.messages,
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
                uiMessages: context.uiMessages,
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
                uiMessages: context.uiMessages,
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
