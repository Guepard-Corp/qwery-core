import { createOpenAI } from '@ai-sdk/openai';
import { LanguageModel } from 'ai';

type ModelProvider = {
  resolveModel: (modelName: string) => LanguageModel;
};

export type LocalLLMModelProviderOptions = {
  baseUrl: string;
  apiKey?: string;
  defaultModel?: string;
};

export function createLocalLLMModelProvider({
  baseUrl,
  apiKey = 'not-needed',
  defaultModel,
}: LocalLLMModelProviderOptions): ModelProvider {
  console.log('[LocalLLMProvider] Creating provider with baseUrl:', baseUrl, 'defaultModel:', defaultModel);

  const openai = createOpenAI({
    baseURL: baseUrl,
    apiKey: apiKey,
  });

  return {
    resolveModel: (modelName) => {
      const finalModel = modelName || defaultModel;
      console.log('[LocalLLMProvider] Resolving model:', finalModel);
      if (!finalModel) {
        throw new Error(
          "[AgentFactory] Missing local LLM model. Provide it as 'local-llm/<model-name>' or set LOCAL_LLM_MODEL.",
        );
      }

      // Use .chat() to ensure we use /v1/chat/completions instead of /v1/responses
      const model = openai.chat(finalModel);

      // HACK: Resolve AI SDK version mismatch. 
      // Force it to v2 to satisfy the strict validation in AI SDK 5.0.93
      if ((model as any).specificationVersion !== 'v2') {
        console.log(`[LocalLLMProvider] HACK: Forcing model spec from ${(model as any).specificationVersion} to v2`);
        (model as any).specificationVersion = 'v2';
      }

      return model;
    },
  };
}
