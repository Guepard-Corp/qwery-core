import { createOpenAI } from '@ai-sdk/openai';
import { LanguageModel } from 'ai';

type ModelProvider = {
  resolveModel: (modelName: string) => LanguageModel;
};

export type LocalModelProviderOptions = {
  /**
   * Base URL for the llama.cpp server running locally.
   * Defaults to LLAMACPP_BASE_URL env variable or 'http://localhost:4040/v1'
   *
   * Note: This connects to YOUR LOCAL llama.cpp server, not to any cloud service.
   * The @ai-sdk/openai package is used because llama.cpp exposes an OpenAI-compatible
   * API format, but all requests go to your local server.
   */
  baseUrl?: string;
  /**
   * Default model name to use when none is specified.
   * Defaults to LLAMACPP_MODEL env variable or 'default'
   *
   * For llama.cpp, this is typically ignored as the server serves
   * whatever model was loaded at startup.
   */
  defaultModel?: string;
};

/**
 * Creates a model provider that connects to a LOCAL llama.cpp server.
 *
 * This provider does NOT connect to any cloud service. It uses the OpenAI-compatible
 * API format that llama.cpp exposes at /v1/chat/completions, but all requests
 * are sent to your local server.
 *
 * To start llama.cpp server:
 * ```bash
 * ./llama-server -m your-model.gguf --port 4040
 * ```
 *
 * @example
 * ```ts
 * // Set LLAMACPP_BASE_URL=http://localhost:4040/v1 in your .env
 * const provider = createLocalModelProvider();
 *
 * // Or with explicit options
 * const provider = createLocalModelProvider({
 *   baseUrl: 'http://localhost:4040/v1',
 * });
 *
 * const model = provider.resolveModel('local-model');
 * ```
 */
export function createLocalModelProvider({
  baseUrl = process.env.LLAMACPP_BASE_URL ?? 'http://localhost:4040/v1',
  defaultModel = process.env.LLAMACPP_MODEL ?? 'default',
}: LocalModelProviderOptions = {}): ModelProvider {
  // We use @ai-sdk/openai because llama.cpp exposes an OpenAI-compatible API.
  // Despite the package name, NO cloud connection is made - all requests go to baseUrl.
  const llamacpp = createOpenAI({
    baseURL: baseUrl,
    apiKey: 'not-needed', // llama.cpp doesn't require auth, but the SDK needs a value
  });

  return {
    resolveModel: (modelName) => {
      const finalModel = modelName || defaultModel;
      if (!finalModel) {
        throw new Error(
          "[AgentFactory] Missing llama.cpp model. Provide it as 'local/<model-name>' or set LLAMACPP_MODEL.",
        );
      }
      // Use .chat() to get the Chat Completions API model, not the Responses API
      return llamacpp.chat(finalModel);
    },
  };
}
