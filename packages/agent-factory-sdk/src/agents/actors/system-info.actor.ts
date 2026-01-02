import { streamText } from 'ai';
import { fromPromise } from 'xstate/actors';
import { SYSTEM_INFO_PROMPT } from '../prompts/system-info.prompt';
import { resolveModel } from '../../services';
import { getDefaultModel } from '../../index';

export const systemInfo = async (text: string) => {
  const result = streamText({
    model: await resolveModel(getDefaultModel()),
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
