import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock';
import { createAzure } from '@ai-sdk/azure';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { type ConfigStore, type LLMProvider, NoLLMProviderError, type ProviderConfig } from '@qwery/domain';
import type { LanguageModel } from 'ai';

export function buildModel(config: ProviderConfig): LanguageModel {
  switch (config.id) {
    case 'azure': {
      const { resourceName, apiKey, deployment, apiVersion, apiKind = 'chat' } = config.values;
      if (!resourceName || !apiKey || !deployment) {
        throw new Error('Azure provider is missing required values (resourceName, apiKey, deployment).');
      }
      const azure = createAzure({
        resourceName,
        apiKey,
        ...(apiVersion ? { apiVersion } : {}),
      });
      const kind = apiKind.toLowerCase();
      if (kind !== 'chat' && kind !== 'responses') {
        throw new Error(`Azure apiKind must be 'chat' or 'responses' (got '${apiKind}').`);
      }
      return kind === 'responses' ? azure.responses(deployment) : azure(deployment);
    }

    case 'bedrock': {
      const { model, apiKey, region } = config.values;
      if (!model) {
        throw new Error('AWS Bedrock provider is missing the required value (model).');
      }
      // The bearer token is entered in /models; fall back to the env var if blank.
      const token = apiKey || process.env.AWS_BEARER_TOKEN_BEDROCK;
      if (!token) {
        throw new Error(
          'AWS Bedrock requires a bearer token (set it in /models, or via AWS_BEARER_TOKEN_BEDROCK).',
        );
      }
      // Region falls back to the AWS_REGION env var when omitted here.
      const bedrock = createAmazonBedrock({ apiKey: token, ...(region ? { region } : {}) });
      return bedrock(model);
    }

    case 'ollama-local':
    case 'ollama-cloud': {
      const { baseURL, apiKey, model } = config.values;
      if (!baseURL || !model) {
        throw new Error(`${config.id} is missing required values (baseURL, model).`);
      }
      const provider = createOpenAICompatible({
        name: config.id,
        baseURL,
        ...(apiKey ? { apiKey } : {}),
      });
      return provider.chatModel(model);
    }

    default: {
      const exhaustive: never = config.id;
      throw new Error(`Unknown provider: ${exhaustive as string}`);
    }
  }
}

class AiSdkLLM implements LLMProvider {
  constructor(private readonly configStore: ConfigStore) {}

  getModel(): LanguageModel {
    const active = this.configStore.getActiveProvider();
    if (!active) throw new NoLLMProviderError();
    return buildModel(active);
  }
}

export function createAiSdkLLM(configStore: ConfigStore): LLMProvider {
  return new AiSdkLLM(configStore);
}

export { NoLLMProviderError } from '@qwery/domain';
