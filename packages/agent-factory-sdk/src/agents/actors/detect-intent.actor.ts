import { generateObject } from 'ai';
import { z } from 'zod';
import { fromPromise } from 'xstate/actors';
import { INTENTS_LIST, IntentSchema } from '../types';
import { DETECT_INTENT_PROMPT } from '../prompts/detect-intent.prompt';
import { resolveModel } from '../../services/model-resolver';

export const detectIntent = async (text: string) => {
  const maxAttempts = 2;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Add timeout to detect hanging calls
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
<<<<<<< HEAD
          () => reject(new Error('generateObject timeout after 30 seconds')),
          30000,
=======
          () => reject(new Error('generateObject timeout after 600 seconds')),
          600000,
>>>>>>> 56a7544 (Initial commit)
        );
      });

      const generatePromise = generateObject({
<<<<<<< HEAD
        model: await resolveModel('azure/gpt-5-mini'),
        schema: IntentSchema,
=======
        model: await resolveModel(process.env.AGENT_MODEL || 'openai/TheBloke/Mistral-7B-Instruct-v0.2-GGUF:Q4_K_M'),
        schema: IntentSchema,
        mode: 'json',
>>>>>>> 56a7544 (Initial commit)
        prompt: DETECT_INTENT_PROMPT(text),
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
    };
  }): Promise<z.infer<typeof IntentSchema>> => {
    try {
      const intent = await detectIntent(input.inputMessage);
      return intent;
    } catch (error) {
      console.error('[detectIntentActor] ERROR:', error);
      throw error;
    }
  },
);
