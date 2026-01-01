import { streamText } from 'ai';
import { Intent } from '../types';
import { SUMMARIZE_INTENT_PROMPT } from '../prompts/summarize-intent.prompt';
import { fromPromise } from 'xstate/actors';
import { resolveModel } from '../../services/model-resolver';

export const summarizeIntent = async (text: string, intent: Intent, model: string) => {
  const result = streamText({
    model: await resolveModel(model),
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
      model: string;
    };
  }) => {
    const result = summarizeIntent(input.inputMessage, input.intent, input.model);
    return result;
  },
);