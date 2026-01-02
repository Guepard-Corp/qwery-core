import { createOpenAI } from '@ai-sdk/openai';
import { LanguageModel, wrapLanguageModel } from 'ai';

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
 *    - LLAMACPP_MODEL (optional)
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
            const finalModel = modelName || defaultModel || 'default';
            const model = provider.chat(finalModel);

            // Wrap the model to inject stop sequences and handle local model quirks
            // explicitly use .chat() to ensure it targets /v1/chat/completions
            // instead of the newer /v1/responses endpoint which llama.cpp doesn't support.
            return wrapLanguageModel({
                model: model as any,
                middleware: {
                    transformParams: async ({ params }) => {
                        return {
                            ...params,
                            // Inject common stop sequences for small local models to prevent role leaking
                            stopSequences: [
                                ...(params.stopSequences || []),
                                '[User]',
                                '[Assistant]',
                                '<|user|>',
                                '<|assistant|>',
                                '### Instruction:',
                                '### Response:',
                            ],
                        };
                    },
                },
            }) as unknown as LanguageModel;
        },
    };
}
