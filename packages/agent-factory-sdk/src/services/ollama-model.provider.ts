import { createOllama } from 'ollama-ai-provider-v2';
import { AiSdkModelProvider } from './ai-sdk-model.provider';

export type OllamaModelProviderOptions = {
  baseUrl?: string;
  defaultModel?: string;
};

export function createOllamaModelProvider({
  baseUrl,
  defaultModel,
}: OllamaModelProviderOptions = {}): AiSdkModelProvider {
  const ollama = createOllama({
    baseURL: baseUrl,
  });

  return new AiSdkModelProvider({
    resolveModel: (modelName) => {
      const finalModel = modelName || defaultModel;
      if (!finalModel) {
        throw new Error(
          "[AgentFactory] Missing Ollama model. Provide it as 'ollama/<model-name>' or set OLLAMA_MODEL.",
        );
      }
      return ollama(finalModel);
    },
  });
}
