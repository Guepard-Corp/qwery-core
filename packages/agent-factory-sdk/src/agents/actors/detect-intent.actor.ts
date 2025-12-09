import { generateObject } from 'ai';
import { z } from 'zod';
import { fromPromise } from 'xstate/actors';
import { IntentSchema } from '../types';
import { DETECT_INTENT_PROMPT } from '../prompts/detect-intent.prompt';
import { resolveModel } from '../../services/model-resolver';

export const detectIntent = async (text: string, model: string) => {
  try {
    const result = await generateObject({
      model: await resolveModel(model),
      schema: IntentSchema,
      prompt: DETECT_INTENT_PROMPT(text),
    });

    return {
      object: result.object,
      usage: result.usage,
    };
  } catch (error) {
    console.error(
      '[detectIntent] ERROR:',
      error instanceof Error ? error.message : String(error),
    );
    if (error instanceof Error && error.stack) {
      console.error('[detectIntent] Stack:', error.stack);
    }
    throw error;
  }
};

export const detectIntentActor = fromPromise(
  async ({
    input,
  }: {
    input: {
      inputMessage: string;
      model: string;
    };
  }): Promise<z.infer<typeof IntentSchema>> => {
    try {
      const result = await detectIntent(input.inputMessage, input.model);
      return result.object;
    } catch (error) {
      console.error('[detectIntentActor] ERROR:', error);
      throw error;
    }
  },
);
