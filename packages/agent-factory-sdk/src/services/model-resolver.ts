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
    case 'llama_cpp': {
      console.log('🟢 Creating llama_cpp provider');
      console.log('🟢 baseUrl:', requireEnv('LLAMA_CPP_BASE_URL', 'Llama.cpp'));
      console.log('🟢 modelName:', modelName);
      
      const { createLlamaCppModelProvider } = await import(
        './models/llama-cpp.provider'
      );
      
      const provider = createLlamaCppModelProvider({
        baseUrl: requireEnv('LLAMA_CPP_BASE_URL', 'Llama.cpp'),
        defaultModel: modelName,
      });
      
      console.log('🟢 llama_cpp provider created successfully');
      return provider;
    }
    default:
      throw new Error(
        `[AgentFactory] Unsupported provider '${providerId}'. Available providers: azure, ollama, browser, transformer-browser, transformer, webllm, llama-cpp.`,
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
  console.log('🔵 Parsed:', { providerId, modelName });
  const provider = await createProvider(providerId, modelName);
  console.log('🔵 Provider created:', provider);
  const model = provider.resolveModel(modelName);
  console.log('🔵 Model resolved:', model);
  return model;
  
}
