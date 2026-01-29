import { transformersJS } from '@browser-ai/transformers-js';
import { LanguageModel } from 'ai';

const MODEL_MAPPING: Record<string, string> = {
  'SmolLM2-360M-Instruct': 'HuggingFaceTB/SmolLM2-360M-Instruct',
};

type ModelProvider = {
  resolveModel: (modelName: string) => LanguageModel;
};

export type TransformerJSModelProviderOptions = {
  defaultModel?: string;
};

export function createTransformerJSModelProvider({
  defaultModel,
}: TransformerJSModelProviderOptions = {}): ModelProvider {
  return {
    resolveModel: (modelName) => {
      const finalModel = modelName || defaultModel;
      if (!finalModel) {
        throw new Error(
          "[AgentFactory] Missing Transformers.js model. Provide it as 'transformer-browser/<model-name>' or 'transformer/<model-name>'.",
        );
      }
      return transformersJS(MODEL_MAPPING[finalModel] || finalModel);
    },
  };
}
