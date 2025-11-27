import { generateObject } from 'ai';
import { z } from 'zod';
import { fromPromise } from 'xstate/actors';
import { IntentSchema } from '../types';
import { createAzure } from '@ai-sdk/azure';
import { DETECT_INTENT_PROMPT } from '../prompts/detect-intent.prompt';

export const detectIntent = async (text: string) => {
  try {
    const apiKey = process.env.AZURE_API_KEY || process.env.VITE_AZURE_API_KEY;
    const resourceName = process.env.AZURE_RESOURCE_NAME || process.env.VITE_AZURE_RESOURCE_NAME;
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || process.env.VITE_AZURE_OPENAI_DEPLOYMENT || 'gpt-5-mini';
    
    if (!apiKey || !resourceName) {
      throw new Error('Azure credentials missing: AZURE_API_KEY and AZURE_RESOURCE_NAME required');
    }
    
    const azureOptions: any = {
      apiKey,
      resourceName,
    };
    
    if (process.env.AZURE_API_VERSION) {
      azureOptions.apiVersion = process.env.AZURE_API_VERSION;
    }
    if (process.env.AZURE_OPENAI_BASE_URL) {
      azureOptions.baseURL = process.env.AZURE_OPENAI_BASE_URL;
    }
    
    const azure = createAzure(azureOptions);
    
    // Add timeout to detect hanging calls
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('generateObject timeout after 30 seconds')), 30000);
    });
    
    const generatePromise = generateObject({
      model: azure(deployment),
      schema: IntentSchema,
      prompt: DETECT_INTENT_PROMPT(text),
    });

    const result = await Promise.race([generatePromise, timeoutPromise]);
    return result.object;
  } catch (error) {
    console.error('[detectIntent] ERROR:', error instanceof Error ? error.message : String(error));
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
