import { createOpenAI } from '@ai-sdk/openai';
import { LanguageModel } from 'ai';

type ModelProvider = {
  resolveModel: (modelName: string) => LanguageModel;
};

export type LlamaCppModelProviderOptions = {
  baseUrl?: string;
  defaultModel?: string;
  apiKey?: string;
};

export function createLlamaCppModelProvider({
  baseUrl,
  defaultModel,
  apiKey,
}: LlamaCppModelProviderOptions = {}): ModelProvider {
  const finalBaseUrl = baseUrl || 'http://localhost:8081';
  const finalApiKey = apiKey || 'not-needed';

  console.log('[LlamaCpp Provider] Initializing with:', {
    baseUrl: finalBaseUrl,
    model: defaultModel,
  });

  const llamacpp = createOpenAI({
    baseURL: `${finalBaseUrl}/v1`,
    apiKey: finalApiKey,
  });

  return {
    resolveModel: (modelName) => {
      const finalModel = modelName || defaultModel || 'llama-model';
      console.log('[LlamaCpp Provider] Resolving model:', finalModel);
      // Use chat() instead of default model to force chat completions endpoint
      return llamacpp.chat(finalModel);
    },
  };
}
