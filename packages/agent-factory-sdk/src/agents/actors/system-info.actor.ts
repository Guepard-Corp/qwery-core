import { streamText } from 'ai';
import { fromPromise } from 'xstate/actors';
import { SYSTEM_INFO_PROMPT } from '../prompts/system-info.prompt';
import { resolveModel } from '../../services';
import { getDefaultModel } from '../../services/get-default-model';

export const systemInfo = async (text: string) =>
  streamText({
    model: await resolveModel(getDefaultModel()),
    prompt: SYSTEM_INFO_PROMPT(text),
  });

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
