import { createOpenAI } from '@ai-sdk/openai';
import type { OpenAIProvider } from '@ai-sdk/openai';
import { LanguageModel } from 'ai';

type ModelProvider = {
  resolveModel: (modelName: string) => LanguageModel;
};

export type LlamaCppModelProviderOptions = {
  baseUrl?: string;
  defaultModel?: string;
  timeout?: number;
  maxRetries?: number;
};

async function checkServerHealth(baseUrl: string, timeout: number = 5000): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.warn('🦙 [LlamaCpp] Health check failed:', error);
    return false;
  }
}

export function createLlamaCppModelProvider({
  baseUrl,
  defaultModel,
  timeout = 10000,
  maxRetries = 3,
}: LlamaCppModelProviderOptions = {}): ModelProvider {
  console.log('🦙 [LlamaCpp] Initializing provider...');
  console.log('🦙 [LlamaCpp] baseUrl:', baseUrl);
  console.log('🦙 [LlamaCpp] defaultModel:', defaultModel);
  console.log('🦙 [LlamaCpp] timeout:', timeout);
  console.log('🦙 [LlamaCpp] maxRetries:', maxRetries);

  if (!baseUrl) {
    console.error('❌ [LlamaCpp] baseUrl is missing');
    throw new Error(
      '[AgentFactory][LlamaCpp] Missing baseUrl. Please set LLAMACPP_BASE_URL environment variable.',
    );
  }

  // Validate baseUrl format
  try {
    new URL(baseUrl);
  } catch {
    throw new Error(
      `[AgentFactory][LlamaCpp] Invalid baseUrl format: ${baseUrl}. Expected format: http://localhost:8080/v1`,
    );
  }

  // Perform health check
  console.log('🦙 [LlamaCpp] Performing server health check...');
  const isHealthy = await checkServerHealth(baseUrl, timeout);
  if (!isHealthy) {
    console.warn('⚠️ [LlamaCpp] Server health check failed. The server may not be running or accessible.');
    console.warn('🦙 [LlamaCpp] Please ensure llama.cpp server is running and accessible at:', baseUrl);
  } else {
    console.log('✅ [LlamaCpp] Server health check passed');
  }

  console.log('🦙 [LlamaCpp] Creating OpenAI-compatible provider with baseURL:', baseUrl);

  const openAIProvider: OpenAIProvider = createOpenAI({
    baseURL: baseUrl,
    name: "llamacpp",
    apiKey: '', // llama.cpp doesn't require authentication
    // Add timeout and retry configuration
    fetch: (url, options) => {
      return fetch(url, {
        ...options,
        signal: AbortSignal.timeout(timeout),
      });
    },
  });

  console.log('🦙 [LlamaCpp] OpenAI provider created successfully');

  return {
    resolveModel: (modelName) => {
      console.log('🦙 [LlamaCpp] resolveModel called');
      console.log('🦙 [LlamaCpp] modelName argument:', modelName);

      const finalModel = modelName || defaultModel;

      console.log('🦙 [LlamaCpp] resolved finalModel:', finalModel);

      if (!finalModel) {
        console.error('❌ [LlamaCpp] finalModel is missing');
        throw new Error(
          "[AgentFactory] Missing LlamaCpp model. Provide it as 'llamacpp/<model-name>' or set LLAMACPP_MODEL.",
        );
      }

      // Validate model name format
      if (!finalModel.includes('/')) {
        console.warn('⚠️ [LlamaCpp] Model name should be in format "llamacpp/model-name"');
      }

      console.log(
        '🦙 [LlamaCpp] Creating model instance with OpenAI provider:',
        finalModel,
      );

      const model = openAIProvider.chat(finalModel);

      // Wrap the model to add retry logic
      return {
        ...model,
        doGenerate: async (options) => {
          let lastError: Error | null = null;
          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
              console.log(`🦙 [LlamaCpp] Attempt ${attempt}/${maxRetries} for model generation`);
              return await model.doGenerate(options);
            } catch (error) {
              lastError = error as Error;
              console.warn(`🦙 [LlamaCpp] Attempt ${attempt} failed:`, error);

              if (attempt < maxRetries) {
                // Wait before retry (exponential backoff)
                const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
                console.log(`🦙 [LlamaCpp] Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
              }
            }
          }

          console.error('❌ [LlamaCpp] All retry attempts failed');
          throw new Error(
            `[AgentFactory][LlamaCpp] Model generation failed after ${maxRetries} attempts. Last error: ${lastError?.message}`,
          );
        },
      };
    },
  };
}
