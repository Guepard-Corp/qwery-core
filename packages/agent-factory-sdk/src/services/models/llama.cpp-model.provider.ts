import { createOpenAI } from '@ai-sdk/openai';
import { LanguageModel } from 'ai';

type ModelProvider = {
    resolveModel: (modelName: string) => LanguageModel;
};

export type LlamaCppModelProviderOptions = {
    baseUrl?: string;
    defaultModel?: string;
};

export function createLlamaCppModelProvider({
    baseUrl,
    defaultModel,
}: LlamaCppModelProviderOptions = {}): ModelProvider {

    if (!baseUrl) {
        throw new Error('[LlamaCppProvider] baseUrl is required');
    }

    // Use OpenAI-compatible chat API
    const llamaCpp = createOpenAI({
        baseURL: baseUrl,
        apiKey: 'not-needed',
        compatibility: 'compatible',
    } as any);

    return {
        resolveModel: (modelName) => {
            // resolve model name
            const finalModel = modelName || defaultModel;

            if (!finalModel) {
                throw new Error('[LlamaCppProvider] Model name is required. Provide it as "local-llama/<model-name>" or set LOCAL_LLAMA_MODEL.');
            }

            // force Chat completions API
            const model = (llamaCpp as any).chat(finalModel, {
                structuredOutputs: false,
            }) as LanguageModel;

            // Catch connection failures during generation/streaming
            const wrapWithConnectionError = (originalFn: Function) => {
                return async (...args: any[]) => {
                    try {
                        return await originalFn(...args);
                    } catch (error: any) {
                        const msg = error?.message?.toLowerCase() || '';
                        const isConnError = msg.includes('fetch failed') || msg.includes('econnrefused') || msg.includes('connecttimeout');

                        if (isConnError) {
                            throw new Error(`[LocalLlama] Connection failed to ${baseUrl}. Is llama-server running?`);
                        }
                        throw error;
                    }
                };
            };

            // Wrap AI SDK methods
            if ((model as any).doGenerate) (model as any).doGenerate = wrapWithConnectionError((model as any).doGenerate.bind(model));
            if ((model as any).doStream) (model as any).doStream = wrapWithConnectionError((model as any).doStream.bind(model));

            return model;
        },
    };
}
