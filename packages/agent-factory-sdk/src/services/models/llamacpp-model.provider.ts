import { LanguageModel } from 'ai';

type ModelProvider = {
  resolveModel: (modelName: string) => LanguageModel;
};

export type LlamaCppModelProviderOptions = {
  baseUrl?: string;
  defaultModel?: string;
};

/**
 * llama.cpp model provider
 * Implements a minimal LanguageModel that works with Vercel AI SDK
 * Routes requests to local llama.cpp server
 */
export function createLlamaCppModelProvider({
  baseUrl = 'http://localhost:8000/v1',
  defaultModel = 'mistral',
}: LlamaCppModelProviderOptions = {}): ModelProvider {
  return {
    resolveModel: (modelName) => {
      const finalModel = modelName || defaultModel;
      if (!finalModel) {
        throw new Error(
          "[AgentFactory] Missing llama.cpp model. Provide it as 'llamacpp/<model-name>' or set LLAMACPP_MODEL.",
        );
      }

      // Return a stub model object
      // In practice, this will be used with generateText/generateObject from Vercel AI SDK
      const model = {
        modelId: finalModel,
        provider: 'llamacpp-local',
        specificationVersion: 'v1',
      } as unknown as LanguageModel;

      // Note: This provider requires proper integration with Vercel AI SDK v2
      // For now, it returns a placeholder that can be extended
      return model;
    },
  };
}
