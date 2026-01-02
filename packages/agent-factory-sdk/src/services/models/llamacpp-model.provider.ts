import { createOpenAI } from '@ai-sdk/openai';
import { LanguageModel } from 'ai';

type ModelProvider = {
  resolveModel: (modelName: string) => LanguageModel;
};

export type LlamaCppModelProviderOptions = {
  baseUrl?: string;
  apiKey?: string;
  defaultModel?: string;
};

export function createLlamaCppModelProvider({
  baseUrl = 'http://localhost:8080',
  apiKey = 'not-needed',
  defaultModel,
}: LlamaCppModelProviderOptions = {}): ModelProvider {
  const openai = createOpenAI({
    baseURL: baseUrl,
    apiKey: apiKey,
  });

  return {
    resolveModel: (modelName) => {
      const finalModel = modelName || defaultModel;

      if (!finalModel) {
        throw new Error(
          "[AgentFactory] Missing LlamaCpp model. Provide it as 'llamacpp/<model-name>' or set LLAMACPP_MODEL.",
        );
      }

      console.log(
        "[LLM] Using local llama.cpp",
        {
          baseUrl,
          model: finalModel,
        }
      );

      return openai(finalModel);
    },
  };
}
