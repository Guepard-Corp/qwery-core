import { webLLM } from '@browser-ai/web-llm';
import { LanguageModel } from 'ai';

type ModelProvider = {
  resolveModel: (modelName: string) => LanguageModel;
};

export type WebLLMModelProviderOptions = {
  defaultModel?: string;
};

export function createWebLLMModelProvider({
  defaultModel,
}: WebLLMModelProviderOptions = {}): ModelProvider {
  return {
    resolveModel: (modelName) => {
      const finalModel = modelName || defaultModel;
      if (!finalModel) {
        throw new Error(
          "[AgentFactory] Missing WebLLM model. Provide it as 'webllm/<model-name>'.",
        );
      }
      return webLLM(finalModel);
    },
  };
}
