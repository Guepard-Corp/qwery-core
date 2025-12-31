import type { LanguageModel } from 'ai';

type ModelProvider = {
  resolveModel: (modelName: string) => LanguageModel;
};

export function createLocalModelProvider(): ModelProvider {
  return {
    resolveModel: (modelName: string) => {
      // This is a placeholder that throws when used.
      // The real integration happens in model-resolver.ts by switching to local mode.
      throw new Error(
        `Local model "${modelName}" called directly. This should be handled in model-resolver.ts.`
      );
    },
  };
}