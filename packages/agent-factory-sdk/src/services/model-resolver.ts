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
  let value: string | undefined;

  if (typeof process !== 'undefined' && process.env) {
    value = process.env[key];
  }
  // Support Vite environment variables in browser context
  if (!value && typeof import.meta !== 'undefined' && import.meta.env) {
    value = import.meta.env[key];
  }

  // Treat empty strings as undefined
  return value && value.trim() !== '' ? value : undefined;
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
    case 'azure': {
      const { createAzureModelProvider } = await import(
        './models/azure-model.provider'
      );
      return createAzureModelProvider({
        resourceName: requireEnv('AZURE_RESOURCE_NAME', 'Azure'),
        apiKey: requireEnv('AZURE_API_KEY', 'Azure'),
        apiVersion: getEnv('AZURE_API_VERSION'),
        baseURL: getEnv('AZURE_OPENAI_BASE_URL'),
        deployment: getEnv('AZURE_OPENAI_DEPLOYMENT') ?? modelName,
      });
    }
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
    case 'anthropic': {
      const { createAnthropicModelProvider } = await import(
        './models/anthropic-model.provider'
      );
      return createAnthropicModelProvider({
        apiKey: getEnv('ANTHROPIC_API_KEY'),
        baseURL: getEnv('ANTHROPIC_BASE_URL'),
      });
    }
    default:
      throw new Error(
        `[AgentFactory] Unsupported provider '${providerId}'. Available providers: azure, ollama, browser, transformer-browser, transformer, webllm, anthropic.`,
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

/**
 * Gets the default model from environment variables.
 * Format: {provider}/{model}
 *
 * Provider is determined from:
 * - AGENT_PROVIDER or VITE_AGENT_PROVIDER
 *
 * Model name is determined from provider-specific env vars (checks both regular and VITE_ prefixed):
 * - Azure: AZURE_OPENAI_DEPLOYMENT or VITE_AZURE_OPENAI_DEPLOYMENT (defaults to "gpt-5-mini")
 * - Ollama: OLLAMA_MODEL or VITE_OLLAMA_MODEL (defaults to "deepseek-r1:8b")
 * - WebLLM: WEBLLM_MODEL or VITE_WEBLLM_MODEL (defaults to "Llama-3.1-8B-Instruct-q4f32_1-MLC")
 * - Transformer: TRANSFORMER_MODEL or VITE_TRANSFORMER_MODEL (defaults to "SmolLM2-360M-Instruct")
 * - Anthropic: ANTHROPIC_MODEL or VITE_ANTHROPIC_MODEL (defaults to "claude-3.5-sonnet")
 * - Browser: "built-in"
 */
export function getDefaultModel(): string {
  const provider =
    getEnv('AGENT_PROVIDER') || getEnv('VITE_AGENT_PROVIDER') || 'azure';

  let modelName: string;
  switch (provider) {
    case 'azure':
      modelName =
        getEnv('AZURE_OPENAI_DEPLOYMENT') ||
        getEnv('VITE_AZURE_OPENAI_DEPLOYMENT') ||
        'gpt-5.2-chat';
      break;
    case 'ollama':
      modelName =
        getEnv('OLLAMA_MODEL') ||
        getEnv('VITE_OLLAMA_MODEL') ||
        'deepseek-r1:8b';
      break;
    case 'webllm':
      modelName =
        getEnv('WEBLLM_MODEL') ||
        getEnv('VITE_WEBLLM_MODEL') ||
        'Llama-3.1-8B-Instruct-q4f32_1-MLC';
      break;
    case 'transformer':
    case 'transformer-browser':
      modelName =
        getEnv('TRANSFORMER_MODEL') ||
        getEnv('VITE_TRANSFORMER_MODEL') ||
        'SmolLM2-360M-Instruct';
      break;
    case 'browser':
      modelName = 'built-in';
      break;
    case 'anthropic':
      modelName =
        getEnv('ANTHROPIC_MODEL') ||
        getEnv('VITE_ANTHROPIC_MODEL') ||
        'claude-3.5-sonnet';
      break;
    default:
      modelName =
        getEnv('AZURE_OPENAI_DEPLOYMENT') ||
        getEnv('VITE_AZURE_OPENAI_DEPLOYMENT') ||
        'gpt-5.2-chat';
      return `azure/${modelName}`;
  }

  return `${provider}/${modelName}`;
}
