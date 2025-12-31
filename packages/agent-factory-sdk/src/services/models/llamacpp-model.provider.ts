import { createOpenAI } from '@ai-sdk/openai';
import { LanguageModel } from 'ai';

type ModelProvider = {
  resolveModel: (modelName: string) => LanguageModel;
};

export type LlamaCppModelProviderOptions = {
  baseUrl?: string;
  defaultModel?: string;
};

export function createLlamaCppModelProvider({
  baseUrl = 'http://127.0.0.1:8080/v1',
  defaultModel,
}: LlamaCppModelProviderOptions = {}): ModelProvider {
  // Create OpenAI provider instance configured for llama.cpp
  const openaiProvider = createOpenAI({
    baseURL: baseUrl,
    apiKey: 'not-needed', // llama.cpp doesn't require an API key
    name: 'llamacpp', // Set provider name for llamacpp
  });

  return {
    resolveModel: (modelName) => {
      const finalModel = modelName || defaultModel;
      if (!finalModel) {
        throw new Error(
          "[AgentFactory] Missing LlamaCpp model. Provide it as 'llamacpp/<model-name>' or set LLAMACPP_MODEL.",
        );
      }

      // Use the chat API (not responses API) to call /v1/chat/completions endpoint
      return openaiProvider.chat(finalModel);
    },
  };
}
