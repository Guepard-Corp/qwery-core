import { generateObject } from 'ai';
import { z } from 'zod';
import { fromPromise } from 'xstate/actors';
import { INTENTS_LIST, IntentSchema } from '../types';
import { DETECT_INTENT_PROMPT } from '../prompts/detect-intent.prompt';
import { resolveModel } from '../../services/model-resolver';

export const detectIntent = async (text: string, model: string) => {
  const maxAttempts = 2;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let timeoutId: NodeJS.Timeout | undefined;
    let timeoutRejected = false;

    // IMPORTANT: timeoutPromise doit être "handled" + clearTimeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        timeoutRejected = true;
        reject(new Error('generateObject timeout after 30 seconds'));
      }, 30000);
    });

    try {
      const generatePromise = generateObject({
        model: await resolveModel(model),
        schema: IntentSchema,
        prompt: DETECT_INTENT_PROMPT(text),
      });

      const result = await Promise.race([
        generatePromise.catch((err) => {
          // Clear timeout if generatePromise rejects first
          if (timeoutId) clearTimeout(timeoutId);
          throw err;
        }),
        timeoutPromise.catch((err) => {
          // Mark timeout as handled
          throw err;
        }),
      ]);
      
      // Clear timeout if generatePromise wins
      if (timeoutId) clearTimeout(timeoutId);
      return result.object;
    } catch (error) {
      lastError = error;
      if (error instanceof Error && error.stack) {
        console.error('[detectIntent] Stack:', error.stack);
      }
      if (attempt === maxAttempts) break;
    } finally {
      // Always clear timeout to prevent leaks
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = undefined;
      }
    }
  }

  console.error(
    '[detectIntent] All attempts failed, falling back to other intent:',
    lastError instanceof Error ? lastError.message : String(lastError),
  );

  return { intent: 'other', complexity: 'simple', needsChart: false, needsSQL: false };
};

export const detectIntentActor = fromPromise(async ({ input }: { input: { inputMessage: string; model: string } }) => {
  return detectIntent(input.inputMessage, input.model);
});
