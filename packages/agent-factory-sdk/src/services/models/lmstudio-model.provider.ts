import { createOpenAI, type OpenAIProviderSettings } from '@ai-sdk/openai';
import { LanguageModel } from 'ai';

type ModelProvider = {
  resolveModel: (modelName: string) => LanguageModel;
};

export type LMStudioModelProviderOptions = OpenAIProviderSettings & {
  // Add any specific options here if needed, but OpenAIProviderSettings should cover baseURL, apiKey etc.
};

export function createLMStudioModelProvider(
  options: LMStudioModelProviderOptions = {},
): ModelProvider {
  const baseURL = options.baseURL ?? 'http://127.0.0.1:1234/v1';
  // LM Studio doesn't strictly require an API key, but we provide a default one.
  const apiKey = options.apiKey ?? 'lm-studio';

  const openai = createOpenAI({
    ...options,
    baseURL,
    apiKey,
  });

  return {
    resolveModel: (modelName) => {
      if (!modelName) {
        throw new Error(
          "[AgentFactory] Missing LM Studio model name. Provide it as 'lmstudio/<model-name>' (e.g. 'lmstudio/lms-default') or set LMSTUDIO_MODEL_NAME.",
        );
      }
      return openai(modelName);
    },
  };
}
