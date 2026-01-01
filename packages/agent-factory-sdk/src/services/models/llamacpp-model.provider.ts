import { LanguageModel } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

type ModelProvider = {
  resolveModel: (modelName: string) => LanguageModel;
};

export type LlamaCppModelProviderOptions = {
  baseUrl?: string;
  defaultModel?: string;
};


export function createLlamaCppModelProvider({
  baseUrl = 'http://localhost:8080',
  defaultModel = 'llama-2-7b-chat',
}: LlamaCppModelProviderOptions = {}): ModelProvider {
  const llamacpp = createOpenAI({
    baseURL: `${baseUrl}/v1`, 
    apiKey: 'not-needed', 
  });

  return {
    resolveModel: (modelName) => {
      const finalModel = modelName || defaultModel;
      if (!finalModel) {
        throw new Error(
          "[AgentFactory] Missing llama.cpp model. Provide it as 'llamacpp/<model-name>' or set LLAMACPP_MODEL.",
        );
      }
      
      return llamacpp(finalModel);
    },
  };
}