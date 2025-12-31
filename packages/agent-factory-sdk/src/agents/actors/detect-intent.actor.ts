import { generateObject } from 'ai';
import { z } from 'zod';
import { fromPromise } from 'xstate/actors';
import { INTENTS_LIST, IntentSchema } from '../types';
import { DETECT_INTENT_PROMPT } from '../prompts/detect-intent.prompt';
import { resolveModel } from '../../services/model-resolver';

export const detectIntent = async (text: string) => {
  const maxAttempts = 3;
  // Allow configuring timeout via environment variable (in milliseconds)
  const defaultTimeoutMs = 90000; // 60 seconds for intent detection (was 90s, reduced for better UX)
  const timeoutMs = typeof process !== 'undefined' && process.env?.INTENT_DETECTION_TIMEOUT_MS
    ? parseInt(process.env.INTENT_DETECTION_TIMEOUT_MS, 10)
    : defaultTimeoutMs;

  console.log('[detectIntent] Starting with timeout: ' + (timeoutMs / 1000) + 's, max attempts: ' + maxAttempts);
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const attemptStartTime = Date.now();
      console.log(`[detectIntent] Attempt ${attempt}/${maxAttempts} - Timeout: ${timeoutMs / 1000}s`);

      // Add timeout to detect hanging calls
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error(`generateObject timeout after ${timeoutMs / 1000} seconds`)),
          timeoutMs,
        );
      });

      const generatePromise = generateObject({
        model: await resolveModel(undefined),
        schema: IntentSchema,
        prompt: DETECT_INTENT_PROMPT(text),
      });

      const result = await Promise.race([generatePromise, timeoutPromise]);
      const attemptDuration = Date.now() - attemptStartTime;

      const intentObject = result.object;
      const matchedIntent = INTENTS_LIST.find(
        (intent) => intent.name === intentObject.intent,
      );

      if (!matchedIntent || matchedIntent.supported === false) {
        console.log('[detectIntent] Intent detection successful (fallback after ' + attemptDuration + 'ms):', intentObject.intent);
        return {
          intent: 'other' as const,
          complexity: intentObject.complexity,
          needsChart: intentObject.needsChart ?? false,
          needsSQL: intentObject.needsSQL ?? false,
        };
      }

      console.log('[detectIntent] Intent detection successful (after ' + attemptDuration + 'ms):', intentObject.intent);
      return intentObject;
    } catch (error) {
      lastError = error;
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[detectIntent] Attempt ${attempt} FAILED: ${errorMsg}`);

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
