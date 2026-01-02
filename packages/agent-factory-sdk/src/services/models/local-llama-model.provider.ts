import {
  createOpenAI,
  type OpenAIProvider,
  type OpenAIProviderSettings,
} from '@ai-sdk/openai';
import { LanguageModel } from 'ai';

type ModelProvider = {
  resolveModel: (modelName: string) => LanguageModel;
};

export type LocalLlamaModelProviderOptions = {
  
  baseUrl?: string;

  defaultModel?: string;

  /** Optional override for provider creation. */
  provider?: OpenAIProvider;
} & Partial<OpenAIProviderSettings>;

function normalizeBaseUrl(baseUrl: string): string {
  // Many OpenAI-compatible servers expose /v1. We normalize to include /v1.
  const trimmed = baseUrl.replace(/\/+$/, '');
  return trimmed.endsWith('/v1') ? trimmed : `${trimmed}/v1`;
}

export function createLocalLlamaModelProvider({baseUrl, defaultModel, provider, 
    ...openAIOptions}: LocalLlamaModelProviderOptions): ModelProvider {
  const finalBaseUrl = normalizeBaseUrl(baseUrl ?? 'http://localhost:8080');

  // Some OpenAI SDK adapters require an apiKey string even if the server ignores it.
  // This is NOT a cloud secret: it's a local dummy value.
  const apiKey = openAIOptions.apiKey ?? 'local-no-key';

  const resolvedProvider: OpenAIProvider =
    provider ??
    createOpenAI({
      ...openAIOptions,
      apiKey,
      baseURL: finalBaseUrl,
    });

  return {
    resolveModel: (modelName) => {
      const finalModel = modelName || defaultModel;
      if (!finalModel) {
        throw new Error(
          `[AgentFactory][Local] Missing local model. Provide model name as 'local/<model>' or set LOCAL_LLM_MODEL environment variable.`,
        );
      }
      return resolvedProvider(finalModel);
    },
  };
}
