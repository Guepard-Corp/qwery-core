import {
  azure as defaultAzureProvider,
  createAzure,
  type AzureOpenAIProvider,
  type AzureOpenAIProviderSettings,
} from '@ai-sdk/azure';
import {
  AiSdkModelProvider,
  type AiSdkModelProviderOptions,
} from './ai-sdk-model.provider';

export type AzureModelProviderOptions = AzureOpenAIProviderSettings & {
  deployment?: string;
  provider?: AzureOpenAIProvider;
  defaultCallSettings?: AiSdkModelProviderOptions['defaultCallSettings'];
};

export function createAzureModelProvider({
  deployment,
  provider,
  defaultCallSettings,
  ...azureOptions
}: AzureModelProviderOptions): AiSdkModelProvider {
  const resolvedProvider: AzureOpenAIProvider =
    provider ??
    (Object.keys(azureOptions).length > 0
      ? createAzure(azureOptions)
      : defaultAzureProvider);

  return new AiSdkModelProvider({
    resolveModel: (modelName) => {
      const finalDeployment = modelName || deployment;
      if (!finalDeployment) {
        throw new Error(
          `[AgentFactory] Missing Azure deployment. Provide model name as 'azure/<deployment>' or set AZURE_OPENAI_DEPLOYMENT.`,
        );
      }

      return resolvedProvider(finalDeployment);
    },
    defaultCallSettings,
  });
}
