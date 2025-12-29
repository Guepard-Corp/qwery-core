import { streamText } from 'ai';
import { fromPromise } from 'xstate/actors';
import { SYSTEM_INFO_PROMPT } from '../prompts/system-info.prompt';
import { resolveModel } from '../../services';

const DEFAULT_AZURE_MODEL = 'azure/gpt-5-mini';

function getSystemInfoModel(): string {
  const hasAzureCreds =
    !!process.env.AZURE_API_KEY && !!process.env.AZURE_RESOURCE_NAME;
  const llamacppModel = process.env.LLAMACPP_MODEL_NAME
    ? `llamacpp/${process.env.LLAMACPP_MODEL_NAME}`
    : 'llamacpp/mistral-7b-instruct-v0.2.Q2_K.gguf';
  return hasAzureCreds ? DEFAULT_AZURE_MODEL : llamacppModel;
}

export const systemInfo = async (text: string) => {
  const result = streamText({
    model: await resolveModel(getSystemInfoModel()),
    prompt: SYSTEM_INFO_PROMPT(text),
  });

  return result;
};

export const systemInfoActor = fromPromise(
  async ({
    input,
  }: {
    input: {
      inputMessage: string;
    };
  }) => {
    const result = systemInfo(input.inputMessage);
    return result;
  },
);
