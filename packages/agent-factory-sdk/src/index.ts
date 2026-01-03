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
    name: 'GPT-5 Mini',
    value: 'azure/gpt-5-mini',
  },
  {
<<<<<<< HEAD
=======
    name: 'Mistral 7B (Local)',
    value: 'openai/TheBloke/Mistral-7B-Instruct-v0.2-GGUF:Q4_K_M',
  },
  {
>>>>>>> 56a7544 (Initial commit)
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
