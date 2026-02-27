import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { LanguageModel } from 'ai';

type ModelProvider = {
  resolveModel: (modelName: string) => LanguageModel;
};

export type OpenAICompatibleModelProviderOptions = {
  name: string;
  baseURL: string;
  apiKey?: string;
  defaultModel?: string;
};

export function createOpenAICompatibleModelProvider({
  name,
  baseURL,
  apiKey,
  defaultModel,
}: OpenAICompatibleModelProviderOptions): ModelProvider {
  const provider = createOpenAICompatible({
    name,
    baseURL,
    ...(apiKey ? { apiKey } : {}),
  });

  return {
    resolveModel: (modelName) => {
      const finalModel = modelName || defaultModel;
      if (!finalModel) {
        throw new Error(
          "[AgentFactory] Missing OpenAI-compatible model. Provide it as 'provider/<model-name>' or set a provider-specific model env var.",
        );
      }
      return provider(finalModel);
    },
  };
}
