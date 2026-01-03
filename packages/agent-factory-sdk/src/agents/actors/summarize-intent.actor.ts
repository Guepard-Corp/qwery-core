import { streamText } from 'ai';
import { Intent } from '../types';
import { SUMMARIZE_INTENT_PROMPT } from '../prompts/summarize-intent.prompt';
import { fromPromise } from 'xstate/actors';
import { resolveModel } from '../../services/model-resolver';

export const summarizeIntent = async (text: string, intent: Intent) => {
  const result = streamText({
<<<<<<< HEAD
    model: await resolveModel('azure/gpt-5-mini'),
=======
    model: await resolveModel(process.env.AGENT_MODEL || 'openai/TheBloke/Mistral-7B-Instruct-v0.2-GGUF:Q4_K_M'),
>>>>>>> 56a7544 (Initial commit)
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
