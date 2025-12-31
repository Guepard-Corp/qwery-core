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
    case 'local': {
      console.log('[AgentFactory] Using local llama.cpp LLM (Phi-3-mini) at http://localhost:8080');

      return {
        resolveModel: (requestedModel: string) => {
          const finalModel = requestedModel || 'phi-3-mini';

          return {
            doGenerate: async (options: any) => {
              const payload = {
                model: finalModel,
                messages: options.messages,
                temperature: 0.7,
                max_tokens: 4096,
                stream: false,
              };

              const response = await fetch('http://localhost:8080/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
              });

              if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Local LLM request failed: ${response.status} ${errorText}`);
              }

              const data = await response.json();

              const content = data.choices?.[0]?.message?.content?.trim() || '';

              return {
                text: content,
                usage: {
                  promptTokens: data.usage?.prompt_tokens || 0,
                  completionTokens: data.usage?.completion_tokens || 0,
                },
                rawResponse: data,
              };
            },
            // Add doStream if streaming is needed later
          } as unknown as LanguageModel;
        },
      };
    }

    // Keep all other cases unchanged
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

    // ... (keep all other cases: ollama, browser, transformer, webllm exactly as they were)

    default:
      throw new Error(
        `[AgentFactory] Unsupported provider '${providerId}'. Available: local, azure, ollama, ...`,
      );
  }
}

export async function resolveModel(
  modelString: string | undefined,
): Promise<LanguageModel> {
  if (!modelString) {
    if (getEnv('USE_LOCAL_LLM') === 'true') {
      modelString = 'local/phi-3-mini';
    } else {
      throw new Error(
        '[AgentFactory] Model string is required but was undefined or empty',
      );
    }
  }

  const { providerId, modelName } = parseModelName(modelString);
  const provider = await createProvider(providerId, modelName);
  return provider.resolveModel(modelName);
}