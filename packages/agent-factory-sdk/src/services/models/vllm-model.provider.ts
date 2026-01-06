import { createOpenAI } from '@ai-sdk/openai';
import { LanguageModel } from 'ai';

type ModelProvider = {
  resolveModel: (modelName: string) => LanguageModel;
};

export type VllmModelProviderOptions = {
  baseURL?: string;
  defaultModel?: string;
  apiKey?: string;
};

export function createVllmModelProvider({
  baseURL = 'http://localhost:8000/v1',
  defaultModel,
  apiKey = 'test-abc123',

}: VllmModelProviderOptions = {}): ModelProvider {
  const vllmProvider = createOpenAI({
    baseURL: baseURL,
    apiKey: apiKey,
  });



  return {

    resolveModel: (modelName) => {
      const finalModel = modelName || defaultModel;
      if (!finalModel) {
        throw new Error(
          "[AgentFactory] Missing vLLM model. Provide it as 'vllm/<model-name>' or set VLLM_MODEL.",
        );
      }

      return vllmProvider(finalModel);
    },
  };
}
