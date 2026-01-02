import { LanguageModel } from 'ai';
import { LocalLanguageModel } from './local-llm';
import { LocalLLMBackend, LocalLLMConfig } from './local-llm/types';

type ModelProvider = {
  resolveModel: (modelName: string) => LanguageModel;
};

async function checkBackendHealth(
  backend: LocalLLMBackend,
  baseUrl: string,
): Promise<boolean> {
  try {
    // Use /v1/models for BOTH backends (OpenAI-compatible endpoint)
    const healthUrl = `${baseUrl}/v1/models`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(healthUrl, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.error(`[LocalLLM] Health check failed for ${backend}:`, error);
    return false;
  }
}

async function detectBackend(): Promise<LocalLLMConfig> {
  const configs: LocalLLMConfig[] = [
    {
      backend: 'llamacpp', // Check llama.cpp FIRST
      baseUrl: process.env.LLAMACPP_BASE_URL ?? 'http://localhost:8080',
      model: process.env.LLAMACPP_MODEL ?? 'Phi-3-mini-4k-instruct-q4.gguf',
    },
    {
      backend: 'vllm',
      baseUrl: process.env.VLLM_BASE_URL ?? 'http://localhost:8000',
      model: process.env.VLLM_MODEL ?? 'HuggingFaceTB/SmolLM-135M',
    },
  ];

  console.log('[LocalLLM] Detecting available backends...');

  for (const config of configs) {
    console.log(`[LocalLLM] Testing ${config.backend} at ${config.baseUrl}`);
    const isHealthy = await checkBackendHealth(config.backend, config.baseUrl);
    if (isHealthy) {
      console.log(`[LocalLLM] ✓ Using ${config.backend} at ${config.baseUrl}`);
      console.log(`[LocalLLM] Model: ${config.model}`);
      return config;
    } else {
      console.warn(
        `[LocalLLM] ✗ ${config.backend} unavailable at ${config.baseUrl}`,
      );
    }
  }

  throw new Error(
    '[LocalLLM] No local LLM backends available. Please start vLLM or llama.cpp.',
  );
}

export async function createLocalLLMModelProvider(): Promise<ModelProvider> {
  const config = await detectBackend();

  return {
    resolveModel(modelName: string) {
      return new LocalLanguageModel(
        { ...config, model: modelName || config.model },
        modelName,
      ) as unknown as LanguageModel;
    },
  };
}
