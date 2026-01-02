import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';

type ModelProvider = {
  resolveModel: (modelName: string) => LanguageModel;
};

export type LlamaCppProviderOptions = {
  baseURL?: string;
  defaultModel?: string;
};

export function createLlamaCppModelProvider({
  baseURL = 'http://127.0.0.1:8081/v1',
  defaultModel,
}: LlamaCppProviderOptions = {}): ModelProvider {
  // llama.cpp exposes an OpenAI-compatible *Chat Completions* API.
  // It does NOT support /v1/responses, so we must use openai.chat(...).
  const openai = createOpenAI({
    baseURL,
    apiKey: 'local', // llama.cpp doesn't require a real key by default
  });

  return {
    resolveModel: (modelName: string) => {
      const finalModel = modelName?.trim() ? modelName : defaultModel;
      if (!finalModel) {
        throw new Error(
          "[AgentFactory] Missing llama.cpp model. Provide 'llamacpp/<model>' or set LLAMACPP_MODEL.",
        );
      }

      // IMPORTANT: use Chat Completions, not Responses API
      return openai.chat(finalModel);
    },
  };
}
