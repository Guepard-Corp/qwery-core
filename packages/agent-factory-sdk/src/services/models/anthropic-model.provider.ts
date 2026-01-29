import {
  anthropic as defaultAnthropicProvider,
  createAnthropic,
  type AnthropicProvider,
  type AnthropicProviderSettings,
} from '@ai-sdk/anthropic';
import { LanguageModel } from 'ai';

type ModelProvider = {
  resolveModel: (modelName: string) => LanguageModel;
};

export type AnthropicModelProviderOptions = AnthropicProviderSettings & {
  provider?: AnthropicProvider;
};

export function createAnthropicModelProvider({
  provider,
  ...anthropicOptions
}: AnthropicModelProviderOptions = {}): ModelProvider {
  const resolvedProvider: AnthropicProvider =
    provider ??
    (Object.keys(anthropicOptions).length > 0
      ? createAnthropic(anthropicOptions)
      : defaultAnthropicProvider);

  return {
    resolveModel: (modelName) => {
      if (!modelName) {
        throw new Error(
          `[AgentFactory] Missing Anthropic model. Provide model name as 'anthropic/<model>' or set ANTHROPIC_MODEL.`,
        );
      }

      return resolvedProvider(modelName);
    },
  };
}
