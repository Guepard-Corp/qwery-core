import { createOpenAI } from '@ai-sdk/openai';
import { LanguageModel } from 'ai';

type ModelProvider = {
  resolveModel: (modelName: string) => LanguageModel;
};

export type LlamaCppModelProviderOptions = {
  baseURL?: string;
  apiKey?: string;
  defaultModel?: string;
};

export function createLlamaCppModelProvider({
  baseURL = 'http://localhost:8080/v1',
  apiKey,
  defaultModel,
}: LlamaCppModelProviderOptions = {}): ModelProvider {
  const llamaCppProvider = createOpenAI({
    baseURL,
    apiKey: apiKey ?? '', // llama.cpp typically doesn't require auth
  });

  console.log('[LlamaCppProvider] Initialized with baseURL:', baseURL);

  return {
    resolveModel: (modelName) => {
      const finalModel = modelName || defaultModel;
      if (!finalModel) {
        throw new Error(
          "[AgentFactory] Missing llama.cpp model. Provide it as 'llama-cpp/<model-name>' or set LLAMA_CPP_MODEL.",
        );
      }

      return llamaCppProvider.chat(finalModel);
    },
  };
}
