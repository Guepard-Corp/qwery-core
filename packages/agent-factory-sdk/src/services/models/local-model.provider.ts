import { createOpenAI } from '@ai-sdk/openai';
import { LanguageModel } from 'ai';

type ModelProvider = {
  resolveModel: (modelName: string) => LanguageModel;
};

export type LocalModelProviderOptions = {
  baseUrl?: string;
  apiKey?: string;
  defaultModel?: string;
};

export function createLocalModelProvider({
  baseUrl,
  apiKey = 'not-needed',
  defaultModel,
}: LocalModelProviderOptions = {}): ModelProvider {
  return {
    resolveModel: (modelName) => {
      const finalModel = modelName || defaultModel;
      if (!finalModel) {
        throw new Error(
          "[AgentFactory] Missing Local model name. Provide it as 'local/<model-name>' or set LOCAL_LLM_MODEL.",
        );
      }

      const openai = createOpenAI({
        baseURL: baseUrl || 'http://localhost:8080/v1',
        apiKey: apiKey,
      });

      return openai(finalModel);
    },
  };
}
