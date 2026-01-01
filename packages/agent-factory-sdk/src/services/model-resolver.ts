import { LanguageModel } from 'ai';

type ModelProvider = {
  resolveModel: (modelName: string) => LanguageModel;
};

function parseModelName(modelString: string): {
  providerId: string;
  modelName: string;
} {
  if (!modelString || typeof modelString !== 'string') {
    throw new Error(
      `[AgentFactory] Invalid model: modelString must be a non-empty string, got '${modelString}'`,
    );
  }
  const parts = modelString.split('/');
  if (parts.length !== 2) {
    throw new Error(
      `[AgentFactory] Invalid model format: expected 'provider/model', got '${modelString}'`,
    );
  }
  return { providerId: parts[0]!, modelName: parts[1]! };
}

function getEnv(key: string): string | undefined {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  return undefined;
}

function requireEnv(key: string, providerLabel: string): string {
  const value = getEnv(key);
  if (!value) {
    throw new Error(
      `[AgentFactory][${providerLabel}] Missing required environment variable '${key}'.`,
    );
  }
  return value;
}

async function createProvider(
  providerId: string,
  modelName: string,
): Promise<ModelProvider> {
  switch (providerId) {
    
    case 'ollama': {
      const { createOllamaModelProvider } = await import(
        './models/ollama-model.provider'
      );
      return createOllamaModelProvider({
        baseUrl: getEnv('OLLAMA_BASE_URL'),
        defaultModel: getEnv('OLLAMA_MODEL') ?? modelName,
      });
    }
    case 'browser': {
      const { createBuiltInModelProvider } = await import(
        './models/built-in-model.provider'
      );
      return createBuiltInModelProvider({});
    }
    case 'transformer-browser':
    case 'transformer': {
      const { createTransformerJSModelProvider } = await import(
        './models/transformerjs-model.provider'
      );
      return createTransformerJSModelProvider({
        defaultModel: getEnv('TRANSFORMER_MODEL') ?? modelName,
      });
    }
    case 'webllm': {
      const { createWebLLMModelProvider } = await import(
        './models/webllm-model.provider'
      );
      return createWebLLMModelProvider({
        defaultModel: getEnv('WEBLLM_MODEL') ?? modelName,
      });
    }
    case 'llamacpp': {
      const { createLlamaCppModelProvider } = await import(
        './models/llamacpp-model.provider'
      );
      return createLlamaCppModelProvider({
        baseUrl: getEnv('LLAMACPP_BASE_URL') || 'http://localhost:8080',
        defaultModel: getEnv('LLAMACPP_MODEL') ?? modelName,
      });
    }
    default:
      throw new Error(
        `[AgentFactory] Unsupported provider '${providerId}'. Available providers: azure, ollama, browser, transformer-browser, transformer, webllm.`,
      );
  }
}

export async function resolveModel(
  modelString: string | undefined,
): Promise<LanguageModel> {
  if (!modelString) {
    throw new Error(
      '[AgentFactory] Model string is required but was undefined or empty',
    );
  }
  const { providerId, modelName } = parseModelName(modelString);
  const provider = await createProvider(providerId, modelName);
  return provider.resolveModel(modelName);
}
