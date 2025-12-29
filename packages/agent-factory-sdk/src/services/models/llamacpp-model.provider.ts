import { createOpenAI } from '@ai-sdk/openai';
import { LanguageModel } from 'ai';

export type LlamaCppModelProviderOptions = {
  baseURL?: string;
  defaultModel?: string;
};

type ModelProvider = {
  resolveModel: (modelName?: string) => LanguageModel;
};

function validateBaseURL(baseURL: string): string {
  try {
    const parsed = new URL(baseURL);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('Invalid protocol');
    }
    return baseURL.replace(/\/+$/, '');
  } catch {
    throw new Error(
      'Invalid LLAMACPP_BASE_URL format. Expected: http://127.0.0.1:8080',
    );
  }
}

export function createLlamaCppModelProvider(
  options: LlamaCppModelProviderOptions = {},
): ModelProvider {
  const rawBaseURL =
    options.baseURL || process.env.LLAMACPP_BASE_URL || 'http://127.0.0.1:8080';

  const baseURL = validateBaseURL(rawBaseURL);

  // ✅ baseURL must end at /v1
  const provider = createOpenAI({
    baseURL: `${baseURL}/v1`,
    apiKey: 'not-needed',
  });

  return {
    resolveModel: (modelName) => {
      const finalModel =
        modelName ||
        options.defaultModel ||
        process.env.LLAMACPP_MODEL_NAME ||
        'mistral-7b-instruct-v0.2.Q2_K.gguf';

      // ✅ this will call /v1/chat/completions (NOT /responses)
      return provider.chat(finalModel);
    },
  };
}
