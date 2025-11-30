import { streamText } from 'ai';
import { createAzure } from '@ai-sdk/azure';
import { fromPromise } from 'xstate/actors';
import { GREETING_PROMPT } from '../prompts/greeting.prompt';

export const greeting = (text: string) => {
  const azure = createAzure({
    apiKey: process.env.AZURE_API_KEY,
    resourceName: process.env.AZURE_RESOURCE_NAME,
  });

  const result = streamText({
    model: azure('gpt-5-mini'),
    prompt: GREETING_PROMPT(text),
  });

  return result;
};

export const greetingActor = fromPromise(
  async ({
    input,
  }: {
    input: {
      inputMessage: string;
    };
  }) => {
    const result = greeting(input.inputMessage);
    return result;
  },
);
