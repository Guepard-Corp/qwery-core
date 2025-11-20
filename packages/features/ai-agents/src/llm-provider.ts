import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { InitProgressCallback } from '@mlc-ai/web-llm';
import { azure, createAzure } from '@ai-sdk/azure';
import { bedrock, createAmazonBedrock } from '@ai-sdk/amazon-bedrock';

import { AiSdkChatModel } from './ai-sdk-chat-model';
import { WebLLMChatModel } from './webllm-chat-model';

const getEnv = (key: string): string | undefined => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  return undefined;
};

interface BaseProviderConfig {
  provider: 'webllm' | 'azure' | 'bedrock';
  temperature?: number;
}

export interface WebLLMProviderConfig extends BaseProviderConfig {
  provider: 'webllm';
  model?: string;
  initProgressCallback?: InitProgressCallback;
}

export interface AzureProviderConfig extends BaseProviderConfig {
  provider: 'azure';
  apiKey?: string;
  endpoint?: string;
  deployment?: string;
  apiVersion?: string;
  promptPrefix?: string;
}

export interface BedrockProviderConfig extends BaseProviderConfig {
  provider: 'bedrock';
  model: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  sessionToken?: string;
  promptPrefix?: string;
}

export type LlmProviderConfig =
  | WebLLMProviderConfig
  | AzureProviderConfig
  | BedrockProviderConfig;

export function createChatModel(
  config: LlmProviderConfig,
): BaseChatModel {
  if (config.provider === 'azure') {
    const resolvedEndpoint =
      config.endpoint ?? getEnv('AZURE_ENDPOINT');
    const azureOptions = {
      apiKey: config.apiKey ?? getEnv('AZURE_API_KEY'),
      baseURL: resolvedEndpoint
        ? `${resolvedEndpoint.replace(/\/+$/, '')}/openai`
        : undefined,
      apiVersion: config.apiVersion ?? getEnv('AZURE_API_VERSION'),
      useDeploymentBasedUrls: true,
    };

    const azureProvider =
      azureOptions.apiKey ||
      azureOptions.baseURL ||
      azureOptions.apiVersion
        ? createAzure(azureOptions)
        : azure;

    const deploymentId =
      config.deployment ?? getEnv('AZURE_DEPLOYMENT_ID') ?? 'gpt-4o-mini';

    return new AiSdkChatModel({
      model: azureProvider(deploymentId),
      promptPrefix: config.promptPrefix,
      temperature: config.temperature,
    });
  }

  if (config.provider === 'bedrock') {
    const bedrockOptions = {
      region: config.region ?? getEnv('AWS_REGION'),
      accessKeyId: config.accessKeyId ?? getEnv('AWS_ACCESS_KEY_ID'),
      secretAccessKey:
        config.secretAccessKey ?? getEnv('AWS_SECRET_ACCESS_KEY'),
      sessionToken: config.sessionToken ?? getEnv('AWS_SESSION_TOKEN'),
    };

    const bedrockProvider =
      bedrockOptions.region ||
      bedrockOptions.accessKeyId ||
      bedrockOptions.secretAccessKey ||
      bedrockOptions.sessionToken
        ? createAmazonBedrock(bedrockOptions)
        : bedrock;

    return new AiSdkChatModel({
      model: bedrockProvider(config.model),
      promptPrefix: config.promptPrefix,
      temperature: config.temperature,
    });
  }

  return new WebLLMChatModel({
    model: config.model,
    temperature: config.temperature,
    initProgressCallback: config.initProgressCallback,
  });
}

