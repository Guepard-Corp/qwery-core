import { streamText } from 'ai';
import { fromPromise } from 'xstate/actors';
import { GREETING_PROMPT } from '../prompts/greeting.prompt';
import { resolveModel } from '../../services';

export const greeting = async (text: string) =>
  streamText({
    model: await resolveModel('azure/gpt-5-mini'),
    prompt: GREETING_PROMPT(text),
  });

export const greetingActor = fromPromise(
  async ({
    input,
  }: {
    input: {
      inputMessage: string;
    };
  }) => greeting(input.inputMessage),
);
