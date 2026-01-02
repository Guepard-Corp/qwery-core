import { createOpenAI } from '@ai-sdk/openai';
import { LanguageModel } from 'ai';

type ModelProvider = {
    resolveModel: (modelName: string) => LanguageModel;
};

export type LlamaCppModelProviderOptions = {
    baseUrl?: string;
    defaultModel?: string;
};

/**
 * Creates a model provider for llama.cpp's OpenAI-compatible API server.
 *
 * To use this provider:
 * 1. Install llama.cpp: `brew install llama.cpp`
 * 2. Start the server: `llama-server -m <model.gguf> --port 8080`
 * 3. Set environment variables:
 *    - LLAMACPP_BASE_URL (default: http://localhost:8080/v1)
 *    - LLAMACPP_MODEL (optional, llama.cpp uses loaded model by default)
 */
export function createLlamaCppModelProvider({
    baseUrl,
    defaultModel,
}: LlamaCppModelProviderOptions = {}): ModelProvider {
    const provider = createOpenAI({
        name: 'llamacpp',
        baseURL: baseUrl || 'http://localhost:8080/v1',
        apiKey: 'unused', // llama.cpp doesn't require an API key
    });

    return {
        resolveModel: (modelName) => {
            // llama.cpp server typically serves a single model,
            // so the model name can be anything - it uses the loaded model
            const finalModel = modelName || defaultModel || 'default';
            return provider.chat(finalModel) as unknown as LanguageModel;
        },
    };
}
