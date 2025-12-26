import { generateObject } from 'ai';
import { z } from 'zod';
import { fromPromise } from 'xstate/actors';
import type { UIMessage } from 'ai';
import { INTENTS_LIST, IntentSchema } from '../types';
import { DETECT_INTENT_PROMPT } from '../prompts/detect-intent.prompt';
import { resolveModel } from '../../services/model-resolver';

export const detectIntent = async (
  text: string,
  previousMessages?: UIMessage[],
) => {
  const maxAttempts = 2;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Add timeout to detect hanging calls
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error('generateObject timeout after 30 seconds')),
          30000,
        );
      });

      const generatePromise = generateObject({
        model: await resolveModel('azure/gpt-5-mini'),
        schema: IntentSchema,
        prompt: DETECT_INTENT_PROMPT(text, previousMessages),
      });

      const result = await Promise.race([generatePromise, timeoutPromise]);

      const intentObject = result.object;
      const matchedIntent = INTENTS_LIST.find(
        (intent) => intent.name === intentObject.intent,
      );

      if (!matchedIntent || matchedIntent.supported === false) {
        return {
          intent: 'other' as const,
          complexity: intentObject.complexity,
          needsChart: intentObject.needsChart ?? false,
          needsSQL: intentObject.needsSQL ?? false,
        };
      }

      return intentObject;
    } catch (error) {
      lastError = error;
      if (error instanceof Error && error.stack) {
        console.error('[detectIntent] Stack:', error.stack);
      }

      if (attempt === maxAttempts) {
        break;
      }
    }
  }

  console.error(
    '[detectIntent] All attempts failed, falling back to other intent:',
    lastError instanceof Error ? lastError.message : String(lastError),
  );

  return {
    intent: 'other' as const,
    complexity: 'simple' as const,
    needsChart: false,
    needsSQL: false,
  };
};

export const detectIntentActor = fromPromise(
  async ({
    input,
  }: {
    input: {
      inputMessage: string;
      model: string;
      previousMessages?: UIMessage[];
    };
  }): Promise<z.infer<typeof IntentSchema>> => {
    try {
      const intent = await detectIntent(
        input.inputMessage,
        input.previousMessages,
      );
      return intent;
    } catch (error) {
      console.error('[detectIntentActor] ERROR:', error);
      throw error;
    }
  },
);
