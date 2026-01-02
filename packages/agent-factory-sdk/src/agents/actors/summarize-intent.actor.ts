import { streamText } from 'ai';
import { Intent } from '../types';
import { SUMMARIZE_INTENT_PROMPT } from '../prompts/summarize-intent.prompt';
import { fromPromise } from 'xstate/actors';
import { resolveModel } from '../../services/model-resolver';

const DEFAULT_AZURE_MODEL = 'azure/gpt-5-mini';

function getSummarizeModel(): string {
  const hasAzureCreds =
    !!process.env.AZURE_API_KEY && !!process.env.AZURE_RESOURCE_NAME;
  const llamacppModel = process.env.LLAMACPP_MODEL_NAME 
    ? `llamacpp/${process.env.LLAMACPP_MODEL_NAME}`
    : 'llamacpp/mistral-7b-instruct-v0.2.Q2_K.gguf';
  return hasAzureCreds ? DEFAULT_AZURE_MODEL : llamacppModel;
}

export const summarizeIntent = async (text: string, intent: Intent) => {
  const result = streamText({
    model: await resolveModel(getSummarizeModel()),
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
