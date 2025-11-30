import { Tool, ToolInput } from '../domain/tool.type';
import { StateData } from '../domain/state-machine.type';
import {
  AgentConstructor,
  AgentFactoryDependencies,
  IAgentFactory,
} from '../ports/agent-factory.port';
import { z } from 'zod';
import { createAzureModelProvider } from './azure-model.provider';
import { createOllamaModelProvider } from './ollama-model.provider';
import { createWebLLMModelProvider } from './webllm-model.provider';
import {
  MultiProviderModelPort,
  type ProviderFactory,
  parseModelName,
} from './multi-provider.model-port';
import { IAgentRunner } from '../ports/agent-runner.port';
import { IAgentMemory } from '../ports/agent-memory.port';
import { IAgentWorkspace } from '../ports/agent-workspace.port';
import { IAgentSideEffects } from '../ports/agent-side-effects.port';
import { UIMessage } from 'ai';
import { AiSdkAgentRunner } from './ai-sdk-agent-runner';
import { AiSdkModelProvider } from './ai-sdk-model.provider';

export class AgentFactory extends IAgentFactory {
  constructor(dependencies?: AgentFactoryDependencies) {
    super(dependencies ?? AgentFactory.resolveDependenciesFromEnv());
  }

  buildAgent<T extends StateData, TMessage = UIMessage>(
    opts: AgentConstructor<T> & { model: unknown | string | { name: string } },
    dependencies?: {
      memory?: IAgentMemory;
      workspace?: IAgentWorkspace;
      sideEffects?: IAgentSideEffects;
    },
  ): IAgentRunner<TMessage, T> {
    // Resolve model if it's a string or object with name property
    const resolvedModel = this.resolveModel(opts.model);

    // Extract model from opts to avoid passing it to AiSdkAgentRunnerOptions
    const { model: _, ...agentOpts } = opts;

    return new AiSdkAgentRunner<T>(agentOpts, {
      model: resolvedModel,
      memory: dependencies?.memory ?? this.dependencies.memory,
      workspace: dependencies?.workspace ?? this.dependencies.workspace,
      sideEffects: dependencies?.sideEffects ?? this.dependencies.sideEffects,
    }) as unknown as IAgentRunner<TMessage, T>;
  }

  /**
   * Resolves a model name string (e.g., "azure/gpt-4o-mini") or model object to an AI SDK model instance.
   * If the input is already a model instance, it returns it as-is.
   */
  resolveModel(model: unknown | string | { name: string }): unknown {
    // If it's already a model instance (not a string or object with name), return as-is
    if (
      typeof model !== 'string' &&
      (!model || typeof model !== 'object' || !('name' in model))
    ) {
      return model;
    }

    // Extract model name string
    const modelName = typeof model === 'string' ? model : model.name;
    if (!modelName || typeof modelName !== 'string') {
      throw new Error(
        `[AgentFactory] Invalid model: expected string or object with 'name' property, got ${typeof model}`,
      );
    }

    // Parse provider and model name
    const { providerId, innerModelName } = parseModelName(modelName);

    // Get provider factories (reuse the same logic as resolveDependenciesFromEnv)
    const getEnv = (key: string): string | undefined => {
      if (typeof process !== 'undefined' && process.env) {
        return process.env[key];
      }
      return undefined;
    };

    const defaultProvider = determineDefaultProvider(getEnv);
    const resolvedProviderId = providerId ?? defaultProvider;

    // Create provider factories
    const providerFactories: Record<string, ProviderFactory> = {
      azure: (modelName) =>
        createAzureModelProvider({
          resourceName: requireEnv('AZURE_RESOURCE_NAME', 'Azure', getEnv),
          apiKey: requireEnv('AZURE_API_KEY', 'Azure', getEnv),
          apiVersion: getEnv('AZURE_API_VERSION'),
          baseURL: getEnv('AZURE_OPENAI_BASE_URL'),
          deployment: getEnv('AZURE_OPENAI_DEPLOYMENT') ?? modelName,
        }),
      ollama: (modelName) =>
        createOllamaModelProvider({
          baseUrl: getEnv('OLLAMA_BASE_URL'),
          defaultModel: getEnv('OLLAMA_MODEL') ?? modelName,
        }),
      webllm: (modelName) =>
        createWebLLMModelProvider({
          defaultModel: getEnv('WEBLLM_MODEL') ?? modelName,
          defaultTemperature: getEnv('WEBLLM_TEMPERATURE')
            ? parseFloat(getEnv('WEBLLM_TEMPERATURE')!)
            : undefined,
        }),
    };

    if (!resolvedProviderId || !(resolvedProviderId in providerFactories)) {
      throw new Error(
        `[AgentFactory] Unsupported provider '${resolvedProviderId}'. Available providers: ${Object.keys(providerFactories).join(', ')}.`,
      );
    }

    // Create provider and resolve model
    const providerFactory = providerFactories[resolvedProviderId]!;
    const provider = providerFactory(innerModelName);

    // The provider is an AiSdkModelProvider, use its resolveModelInstance method
    if (provider instanceof AiSdkModelProvider) {
      return provider.resolveModelInstance(innerModelName);
    }

    throw new Error(
      `[AgentFactory] Provider for '${resolvedProviderId}' did not return an AiSdkModelProvider instance.`,
    );
  }

  async createTool<TName extends string, TInput extends ToolInput, TOutput>({
    name,
    description,
    parameters,
    handler,
  }: {
    name: TName;
    description?: string;
    parameters?: TInput;
    handler: (input: z.infer<TInput>) => Promise<TOutput>;
  }): Promise<Tool<TName, TInput, TOutput>> {
    return {
      name,
      description,
      parameters,
      handler: async (input: z.infer<TInput>) => {
        return await handler(input);
      },
    };
  }

  static async createTool<
    TName extends string,
    TInput extends ToolInput,
    TOutput,
  >({
    name,
    description,
    parameters,
    handler,
  }: {
    name: TName;
    description?: string;
    parameters?: TInput;
    handler: (input: z.infer<TInput>) => Promise<TOutput>;
  }): Promise<Tool<TName, TInput, TOutput>> {
    return {
      name,
      description,
      parameters,
      handler: async (input: z.infer<TInput>) => {
        return await handler(input);
      },
    };
  }

  private static resolveDependenciesFromEnv(): AgentFactoryDependencies {
    // Browser-safe environment variable access
    const getEnv = (key: string): string | undefined => {
      if (typeof process !== 'undefined' && process.env) {
        return process.env[key];
      }
      return undefined;
    };

    const defaultProvider = determineDefaultProvider(getEnv);

    const providerFactories: Record<string, ProviderFactory> = {
      azure: (modelName) =>
        createAzureModelProvider({
          resourceName: requireEnv('AZURE_RESOURCE_NAME', 'Azure', getEnv),
          apiKey: requireEnv('AZURE_API_KEY', 'Azure', getEnv),
          apiVersion: getEnv('AZURE_API_VERSION'),
          baseURL: getEnv('AZURE_OPENAI_BASE_URL'),
          deployment: getEnv('AZURE_OPENAI_DEPLOYMENT') ?? modelName,
        }),
      ollama: (modelName) =>
        createOllamaModelProvider({
          baseUrl: getEnv('OLLAMA_BASE_URL'),
          defaultModel: getEnv('OLLAMA_MODEL') ?? modelName,
        }),
      webllm: (modelName) =>
        createWebLLMModelProvider({
          defaultModel: getEnv('WEBLLM_MODEL') ?? modelName,
          defaultTemperature: getEnv('WEBLLM_TEMPERATURE')
            ? parseFloat(getEnv('WEBLLM_TEMPERATURE')!)
            : undefined,
        }),
    };

    if (!(defaultProvider in providerFactories)) {
      throw new Error(
        `[AgentFactory] Unsupported default provider '${defaultProvider}'. Supported providers: ${Object.keys(providerFactories).join(', ')}.`,
      );
    }

    const aiModelPort = new MultiProviderModelPort({
      providers: providerFactories,
      defaultProvider,
    });

    return { aiModelPort };
  }
}

function requireEnv(
  key: string,
  providerLabel?: string,
  getEnv?: (key: string) => string | undefined,
): string {
  const value = getEnv
    ? getEnv(key)
    : typeof process !== 'undefined' && process.env
      ? process.env[key]
      : undefined;
  if (!value) {
    const scope = providerLabel ? `${providerLabel} provider` : 'AgentFactory';
    throw new Error(
      `[AgentFactory][${scope}] Missing required environment variable '${key}'.`,
    );
  }
  return value;
}

const isBrowserEnvironment = (): boolean =>
  typeof window !== 'undefined' || typeof document !== 'undefined';

const hasAzureCredentials = (getEnv: (key: string) => string | undefined) =>
  Boolean(getEnv('AZURE_RESOURCE_NAME') && getEnv('AZURE_API_KEY'));

function determineDefaultProvider(getEnv: (key: string) => string | undefined) {
  const configuredProvider = getEnv('AGENT_PROVIDER');
  if (configuredProvider) {
    return configuredProvider.toLowerCase();
  }

  const browser = isBrowserEnvironment();
  if (!browser && !hasAzureCredentials(getEnv)) {
    return 'webllm';
  }

  return browser ? 'webllm' : 'azure';
}
