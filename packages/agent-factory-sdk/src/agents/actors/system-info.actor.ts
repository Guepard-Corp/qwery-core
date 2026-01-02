import { streamText } from 'ai';
import { fromPromise } from 'xstate/actors';
import { SYSTEM_INFO_PROMPT } from '../prompts/system-info.prompt';
import { resolveModel, getDefaultModel } from '../../services/model-resolver';

export const systemInfo = async (text: string) => {
  const modelId = getDefaultModel();
  const isLocal = modelId.includes('llamacpp');
  const basePrompt = SYSTEM_INFO_PROMPT(isLocal);
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

export const systemInfoActor = fromPromise(
  async ({ input }: { input: { inputMessage: string } }) => {
    const result = systemInfo(input.inputMessage);
    return result;
  },
);
