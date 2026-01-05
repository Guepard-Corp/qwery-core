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


async function createProvider(
  providerId: string,
  modelName: string,
): Promise<ModelProvider> {
  switch (providerId) {
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
        baseUrl: getEnv('LLAMACPP_BASE_URL'),
        defaultModel: getEnv('LLAMACPP_MODEL') ?? modelName,
        apiKey: getEnv('LLAMACPP_API_KEY'),
      });
    }
    default:
      throw new Error(
        `[AgentFactory] Unsupported provider '${providerId}'. Available providers: browser, transformer-browser, transformer, webllm, llamacpp.`,
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
