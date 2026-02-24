import type { LanguageModel } from 'ai';
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createAzure } from '@ai-sdk/azure';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

import modelsManifest from '../../models.json';

export type Model = {
  providerID: string;
  id: string;
  api: { id: string; npm: string; url: string };
  apiId?: string;
  limit?: {
    context: number;
    output: number;
    input?: number;
  };
};

type SDKWithLanguageModel = { languageModel(modelId: string): LanguageModel };
type CreateProvider = (
  options: Record<string, unknown>,
) => SDKWithLanguageModel;

const BUNDLED_PROVIDERS: Record<string, CreateProvider> = {
  '@ai-sdk/amazon-bedrock': createAmazonBedrock as unknown as CreateProvider,
  '@ai-sdk/anthropic': createAnthropic as unknown as CreateProvider,
  '@ai-sdk/azure': createAzure as unknown as CreateProvider,
  '@ai-sdk/openai': createOpenAI as unknown as CreateProvider,
  '@ai-sdk/openai-compatible':
    createOpenAICompatible as unknown as CreateProvider,
};

type ManifestModel = {
  id: string;
  [key: string]: unknown;
};

type ManifestProvider = {
  id: string;
  name?: string;
  env?: string[];
  npm?: string;
  api?: string;
  models: Record<string, ManifestModel>;
};

type Manifest = Record<string, ManifestProvider>;

function buildProviders(
  manifest: Manifest,
): Record<
  string,
  { id: string; name: string; env: string[]; models: Record<string, Model> }
> {
  const providers: Record<
    string,
    { id: string; name: string; env: string[]; models: Record<string, Model> }
  > = {};
  for (const [providerID, raw] of Object.entries(manifest)) {
    const npm = raw.npm ?? '@ai-sdk/openai-compatible';
    const apiUrl = typeof raw.api === 'string' ? raw.api : '';
    const env = Array.isArray(raw.env) ? raw.env : [];
    const models: Record<string, Model> = {};
    for (const [modelKey, m] of Object.entries(raw.models ?? {})) {
      const modelId = (m as ManifestModel).id ?? modelKey;
      const rawLimit = (m as ManifestModel).limit as
        | { context?: number; output?: number; input?: number }
        | undefined;
      const model: Model = {
        providerID,
        id: modelKey,
        api: { id: modelId, npm, url: apiUrl },
        apiId: modelId,
        ...(rawLimit?.context !== undefined || rawLimit?.output !== undefined
          ? {
              limit: {
                context: rawLimit?.context ?? 0,
                output: rawLimit?.output ?? 0,
                ...(rawLimit?.input !== undefined && { input: rawLimit.input }),
              },
            }
          : {}),
      };
      models[modelKey] = model;
    }
    providers[providerID] = {
      id: providerID,
      name: raw.name ?? providerID,
      env,
      models,
    };
  }
  return providers;
}

const providers = buildProviders(modelsManifest as Manifest);

const sdkCache = new Map<string, SDKWithLanguageModel>();
const languageModelsCache = new Map<string, LanguageModel>();

function getProvider(
  providerID: string,
):
  | { id: string; name: string; env: string[]; models: Record<string, Model> }
  | undefined {
  return providers[providerID];
}

function sdkCacheKey(
  providerID: string,
  npm: string,
  options: Record<string, unknown>,
): string {
  return `${providerID}:${npm}:${JSON.stringify(options)}`;
}

async function getSDK(model: Model): Promise<SDKWithLanguageModel> {
  const provider = getProvider(model.providerID);
  if (!provider) {
    throw new ModelNotFoundError({
      providerID: model.providerID,
      modelID: model.id,
    });
  }
  const bundled = BUNDLED_PROVIDERS[model.api.npm];
  if (!bundled) {
    const supported = Object.keys(BUNDLED_PROVIDERS).join(', ');
    throw new Error(
      `Unsupported provider: ${model.api.npm}. Supported: ${supported}`,
    );
  }

  const options: Record<string, unknown> = {
    name: model.providerID,
    ...(model.api.url ? { baseURL: model.api.url } : {}),
  };

  if (model.api.npm === '@ai-sdk/openai-compatible') {
    options.includeUsage = true;
  }

  if (model.api.npm === '@ai-sdk/azure' && provider.env.length >= 2) {
    const resourceName =
      typeof process !== 'undefined' && provider.env[0]
        ? process.env[provider.env[0]]
        : undefined;
    const apiKey =
      typeof process !== 'undefined' && provider.env[1]
        ? process.env[provider.env[1]]
        : undefined;
    if (resourceName) options.resourceName = resourceName;
    if (apiKey !== undefined && apiKey !== '') options.apiKey = apiKey;
  } else {
    const envKey = provider.env[0];
    const apiKey =
      typeof process !== 'undefined' && envKey
        ? process.env[envKey]
        : undefined;
    if (apiKey !== undefined && apiKey !== '') options.apiKey = apiKey;
  }

  const key = sdkCacheKey(model.providerID, model.api.npm, options);
  const cached = sdkCache.get(key);
  if (cached) return cached;
  const sdk = bundled(options);
  sdkCache.set(key, sdk);
  return sdk;
}

export const ModelNotFoundError = class ModelNotFoundError extends Error {
  constructor(
    public payload: {
      providerID: string;
      modelID: string;
      suggestions?: string[];
    },
  ) {
    super(`Model not found: ${payload.providerID}/${payload.modelID}`);
    this.name = 'ModelNotFoundError';
  }
};

function getModel(providerID: string, modelID: string): Model {
  const provider = getProvider(providerID);
  if (!provider) {
    const suggestions = Object.keys(providers).slice(0, 3);
    throw new ModelNotFoundError({ providerID, modelID, suggestions });
  }
  const model = provider.models[modelID];
  if (!model) {
    const suggestions = Object.keys(provider.models).slice(0, 3);
    throw new ModelNotFoundError({ providerID, modelID, suggestions });
  }
  return model;
}

export const Provider = {
  getModel(providerID: string, modelID: string): Model {
    return getModel(providerID, modelID);
  },

  getModelFromString(str: string): Model {
    const trimmed = str.trim();
    if (!trimmed) {
      throw new ModelNotFoundError({ providerID: '', modelID: '' });
    }
    const idx = trimmed.indexOf('/');
    const providerID = idx === -1 ? trimmed : trimmed.slice(0, idx);
    const modelID = idx === -1 ? '' : trimmed.slice(idx + 1);
    if (!modelID) {
      throw new ModelNotFoundError({ providerID, modelID: '' });
    }
    return getModel(providerID, modelID);
  },

  getDefaultModel(): Model {
    const envOverride =
      typeof process !== 'undefined' ? process.env.DEFAULT_MODEL : undefined;
    if (envOverride?.includes('/')) {
      try {
        return Provider.getModelFromString(envOverride);
      } catch {
        // fall through to first available
      }
    }
    const providerIds = Object.keys(providers);
    for (const providerID of providerIds) {
      const provider = providers[providerID];
      if (!provider) continue;
      const modelIds = Object.keys(provider.models);
      const firstModelId = modelIds[0];
      if (firstModelId) {
        return getModel(providerID, firstModelId);
      }
    }
    throw new Error('No models available in models.json');
  },

  async getLanguage(model: Model): Promise<LanguageModel> {
    const key = `${model.providerID}/${model.id}`;
    const cached = languageModelsCache.get(key);
    if (cached) return cached;
    const sdk = await getSDK(model);
    const language = sdk.languageModel(model.api.id) as LanguageModel;
    languageModelsCache.set(key, language);
    return language;
  },
};
