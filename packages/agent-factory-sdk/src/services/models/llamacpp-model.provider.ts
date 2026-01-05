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
  const resolvedBaseUrl = baseUrl || 'http://localhost:8080/v1';
  const resolvedApiKey = apiKey || 'llamacpp-local';

  const llamacpp = createOpenAI({
    baseURL: resolvedBaseUrl,
    apiKey: resolvedApiKey,
  });

  return {
    resolveModel: (modelName) => {
      const finalModel = modelName || defaultModel;
      if (!finalModel) {
        throw new Error(
          "[AgentFactory] Missing LlamaCpp model. Provide it as 'llamacpp/<model-name>' or set LLAMACPP_MODEL.",
        );
      }
      return llamacpp.chat(finalModel);
    },
  };
}
