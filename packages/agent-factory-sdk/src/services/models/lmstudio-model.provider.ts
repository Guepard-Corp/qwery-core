import { createOpenAI } from '@ai-sdk/openai';
import { LanguageModel } from 'ai';

type ModelProvider = {
  resolveModel: (modelName: string) => LanguageModel;
};

export type LMStudioProviderOptions = {
  baseURL?: string;
  defaultModel?: string;
};

export function createLMStudioModelProvider({
  baseURL = 'http://127.0.0.1:1234/v1',
  defaultModel,
}: LMStudioProviderOptions = {}): ModelProvider {
  // LM Studio uses OpenAI-compatible API, so we use the OpenAI SDK with custom baseURL
  const openai = createOpenAI({
    baseURL,
    apiKey: 'lm-studio', // LM Studio doesn't require a real API key
  });

  return {
    resolveModel: (modelName) => {
      const finalModel = modelName || defaultModel;
      if (!finalModel) {
        throw new Error(
          "[AgentFactory] Missing LM Studio model. Provide it as 'lmstudio/<model-name>' or set LMSTUDIO_MODEL.",
        );
      }
      return openai(finalModel);
    },
  };
}  