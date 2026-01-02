import type { LanguageModel } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

export function createOpenAIModelProvider(opts: {
  apiKey: string;
  baseURL?: string;
  defaultModel: string;
}): { resolveModel: (modelName?: string) => LanguageModel } {
    const client = createOpenAI({
        apiKey: opts.apiKey,
        baseURL: opts.baseURL, // http://127.0.0.1:8080/v1
    });
  return {
    // ✅ Force /v1/chat/completions (compatible llama.cpp)
    resolveModel: (modelName?: string) =>
      client.chat(modelName ?? opts.defaultModel),
  };
}
