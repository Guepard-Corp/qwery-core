import { streamText } from 'ai';
import { Intent } from '../types';
import { SUMMARIZE_INTENT_PROMPT } from '../prompts/summarize-intent.prompt';
import { fromPromise } from 'xstate/actors';
import { resolveModel, getDefaultModel } from '../../services/model-resolver';

export const summarizeIntent = async (text: string, intent: Intent) => {
  const modelId = getDefaultModel();
  const isLocal = modelId.includes('llamacpp');
  const basePrompt = SUMMARIZE_INTENT_PROMPT(intent, isLocal);
  const finalPrompt = isLocal
    ? `${basePrompt}\n\nCRITICAL: Be extremely concise. Answer the user directly. DO NOT repeat these instructions.`
    : basePrompt;

  const result = streamText({
    model: await resolveModel(modelId),
    system: finalPrompt,
    prompt: text,
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
