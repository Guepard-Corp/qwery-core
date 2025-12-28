import { generateObject, generateText } from 'ai';
import { z } from 'zod';
import { fromPromise } from 'xstate/actors';
import { INTENTS_LIST, IntentSchema } from '../types';
import { DETECT_INTENT_PROMPT } from '../prompts/detect-intent.prompt';
import { resolveModel } from '../../services/model-resolver';
import { getDefaultModel } from '../../services/get-default-model';

/**
 * Parse intent from plain text response (fallback for models without structured output)
 */
function parseIntentFromText(text: string): z.infer<typeof IntentSchema> {
  const lowerText = text.toLowerCase();

  // Helper to check if a keyword is negated (e.g., "not a greeting", "no sql")
  // Checks the preceding 20 characters for negative words
  const isNegated = (keyword: string) => {
    const index = lowerText.indexOf(keyword);
    if (index === -1) return false;
    const context = lowerText.substring(Math.max(0, index - 20), index);
    return context.includes('not') ||
      context.includes('no ') ||
      context.includes('don\'t') ||
      context.includes('doesn\'t') ||
      context.includes('without');
  };

  // Simple keyword-based intent detection as fallback
  let intent: string = 'other';
  let needsSQL = false;
  let needsChart = false;

  // Check for data/query related keywords
  const hasQueryIndicator = lowerText.includes('query') || lowerText.includes('sql') ||
    lowerText.includes('select') || lowerText.includes('table') ||
    lowerText.includes('data') || lowerText.includes('database') ||
    lowerText.includes('column') || lowerText.includes('header') ||
    lowerText.includes('file');

  if (hasQueryIndicator && !isNegated('sql') && !isNegated('query') && !isNegated('data') && !isNegated('file')) {
    intent = 'read_data';
    needsSQL = true;
  }

  // Check for chart/visualization keywords
  if ((lowerText.includes('chart') || lowerText.includes('graph') ||
    lowerText.includes('visualiz') || lowerText.includes('plot')) &&
    !isNegated('chart') && !isNegated('visualiz')) {
    needsChart = true;
  }

  // Check for greeting - only if it's not a query
  if (intent !== 'read_data' && (lowerText.includes('hello') || lowerText.includes('hi ') ||
    lowerText.includes('hey') || lowerText.includes('greet')) &&
    !isNegated('greet') && !isNegated('hello') && !isNegated('hi ')) {
    intent = 'greeting';
  }

  console.log('[detectIntent] Parsed logic result:', { intent, needsSQL, needsChart });

  return {
    intent: intent as z.infer<typeof IntentSchema>['intent'],
    complexity: 'simple' as const,
    needsChart,
    needsSQL,
  };
}

export const detectIntent = async (text: string) => {
  const maxAttempts = 2;
  let lastError: unknown;

  const modelToUse = getDefaultModel();
  const isLocalLLM = modelToUse.startsWith('local-llm/');

  console.log('[detectIntent] Using model:', modelToUse, 'isLocalLLM:', isLocalLLM);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Add timeout to detect hanging calls
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error('Intent detection timeout after 60 seconds')),
          60000,
        );
      });

      // For local LLMs, use simple text generation and parse the response
      // Most local models don't support structured output (generateObject)
      if (isLocalLLM) {
        console.log('[detectIntent] Using text-based intent detection for local LLM');

        // Simple prompt for intent detection
        const simplePrompt = `Analyze the user message: "${text}"

Answer YES or NO to these three questions:
1. Is this message a basic greeting (like "hi", "hello")? 
2. Does the message ask to read data, columns, headers or perform a query?
3. Does the message ask for a chart, graph or visualization?

Format:
Greeting: [YES/NO]
Query: [YES/NO]
Chart: [YES/NO]`;

        const generatePromise = generateText({
          model: await resolveModel(modelToUse),
          prompt: simplePrompt,
          temperature: 0.1, // Lower temperature for more consistent classification
        });

        try {
          const result = await Promise.race([generatePromise, timeoutPromise]);
          console.log('[detectIntent] Local LLM response:', result.text);
          return parseIntentFromText(result.text + ' ' + text);
        } catch (llmError) {
          // If LLM fails, use keyword-based detection on original text
          console.warn('[detectIntent] LLM call failed, using keyword detection:', llmError);
          return parseIntentFromText(text);
        }
      }

      // For cloud models (Azure, etc.), use structured output
      const generatePromise = generateObject({
        model: await resolveModel(modelToUse),
        schema: IntentSchema,
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
    '[detectIntent] All attempts failed, falling back to keyword detection:',
    lastError instanceof Error ? lastError.message : String(lastError),
  );

  // Fallback to keyword-based detection
  return parseIntentFromText(text);
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
