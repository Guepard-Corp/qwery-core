import { createOpenAI } from '@ai-sdk/openai';
import { LanguageModel } from 'ai';

type ModelProvider = {
  resolveModel: (modelName: string) => LanguageModel;
};

export type LocalModelProviderOptions = {
  baseURL?: string;
  apiKey?: string;
};

/**
 * Technical Assessment: Integrating Local LLM (llama.cpp)
 */
export function createLocalModelProvider({
  baseURL = process.env.LOCAL_LLM_ENDPOINT || 'http://localhost:8080/v1',
  apiKey = 'not-needed',
}: LocalModelProviderOptions = {}): ModelProvider {

  // llama.cpp server is OpenAI-compatible
  const localProvider = createOpenAI({
    baseURL,
    apiKey,
  });

  return {
    resolveModel: (modelName) => {
      // It talks to  local llama-server
      const finalModel = modelName || process.env.LOCAL_LLM_MODEL || 'local-model';
      return localProvider(finalModel);
    },
  };
}