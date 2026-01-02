import { streamText } from 'ai';
import { fromPromise } from 'xstate/actors';
import { resolveModel } from '../../services/model-resolver';
import { SUMMARIZE_INTENT_PROMPT } from '../prompts/summarize-intent.prompt';
import { Intent } from '../types';

export const summarizeIntent = async (
  text: string,
  intent: Intent,
  model: string,
) => {
  console.log(
    '[summarizeIntent] Starting for intent:',
    intent,
    'with model:',
    model,
  );
  try {
    const result = await streamText({
      model: await resolveModel(model),
      prompt: SUMMARIZE_INTENT_PROMPT(text, intent),
    });
    console.log('[summarizeIntent] streamText returned successfully');
    return result;
  } catch (error) {
    console.error('[summarizeIntent] Error:', error);
    throw error;
  }
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
    const result = await summarizeIntent(
      input.inputMessage,
      input.intent,
      input.model,
    );
    return result;
  },
);
