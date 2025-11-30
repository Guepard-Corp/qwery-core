import { streamText } from 'ai';
import { Intent } from '../types';
import { createAzure } from '@ai-sdk/azure';
import { SUMMARIZE_INTENT_PROMPT } from '../prompts/summarize-intent.prompt';
import { fromPromise } from 'xstate/actors';

export const summarizeIntent = (text: string, intent: Intent) => {
  const azure = createAzure({
    apiKey: process.env.AZURE_API_KEY,
    resourceName: process.env.AZURE_RESOURCE_NAME,
  });

  const result = streamText({
    model: azure('gpt-5-mini'),
    prompt: SUMMARIZE_INTENT_PROMPT(text, intent),
  });

  return result;
};

export const summarizeIntentActor = fromPromise(
  async ({
    input,
  }: {
    input: {
      inputMessage: string;
      intent: Intent;
    };
  }) => {
    const result = summarizeIntent(input.inputMessage, input.intent);
    return result;
  },
);
