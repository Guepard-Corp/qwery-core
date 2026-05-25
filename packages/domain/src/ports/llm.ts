/**
 * Opaque model type — the domain treats LLM models as opaque values handed
 * out by an adapter and consumed by the application. Adapters return a concrete
 * SDK model (e.g. `ai`'s `LanguageModel`); application casts at the boundary.
 * This keeps the domain free of any AI-framework dependency.
 */
export type Model = unknown;

export interface LLMProvider {
  getModel(): Model;
}

export class NoLLMProviderError extends Error {
  constructor() {
    super('No LLM provider configured. Open the in-app /models menu to connect one.');
    this.name = 'NoLLMProviderError';
  }
}
