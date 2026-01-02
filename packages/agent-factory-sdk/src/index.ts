// Export all from subdirectories
export * from './domain';
export * from './ports';
export * from './services';
export * from './agents';

// Export tool types
export * from './agents/tools/types';
export * from './agents/tools/inferred-types';

// Reexport AI SDK
export type { UIMessage } from 'ai';
export {
  convertToModelMessages,
  streamText,
  generateText,
  validateUIMessages,
} from 'ai';
export { createAzure } from '@ai-sdk/azure';

const baseModels = [
  {
    name: 'llama.cpp (Local)',
    value: 'local/default',
  },
  {
    name: 'GPT-5 Mini',
    value: 'azure/gpt-5-mini',
  },
  {
    name: 'DeepSeek R1 (8B)',
    value: 'ollama/deepseek-r1:8b',
  },
  {
    name: 'Llama 3.1 (8B)',
    value: 'webllm/Llama-3.1-8B-Instruct-q4f32_1-MLC',
  },
  {
    name: 'SmolLM2 (360M)',
    value: 'transformer-browser/SmolLM2-360M-Instruct',
  },
  {
    name: 'Built-in Browser',
    value: 'browser/built-in',
  },
];

export const SUPPORTED_MODELS = baseModels;

/**
 * Get the default model from environment variable or fallback to local provider.
 * Set VITE_DEFAULT_MODEL in .env to override (e.g., 'local/default', 'ollama/llama3', 'azure/gpt-5-mini')
 */
export function getDefaultModel(): string {
  if (typeof process !== 'undefined' && process.env?.VITE_DEFAULT_MODEL) {
    return process.env.VITE_DEFAULT_MODEL;
  }
  // Fallback to local model for fully local development
  return 'local/default';
}
