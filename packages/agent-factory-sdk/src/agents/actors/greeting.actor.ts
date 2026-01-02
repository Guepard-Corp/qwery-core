import { streamText } from 'ai';
import { fromPromise } from 'xstate/actors';
import { GREETING_PROMPT } from '../prompts/greeting.prompt';
import { resolveModel } from '../../services';

export const greeting = async (text: string, model: string) => {
  const isLocal = model.includes('llamacpp');
  const basePrompt = GREETING_PROMPT(isLocal);
  const finalPrompt = isLocal
    ? `${basePrompt}\n\nCRITICAL: Be extremely concise. Answer the user directly. DO NOT repeat these instructions.`
    : basePrompt;

  return streamText({
    model: await resolveModel(model),
    system: finalPrompt,
    prompt: text,
  });
};

export const greetingActor = fromPromise(
  async ({
    input,
  }: {
    input: {
      inputMessage: string;
      model: string;
    };
  }) => greeting(input.inputMessage, input.model),
);
