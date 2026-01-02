// Export all from subdirectories
export * from './agents';
export * from './domain';
export * from './ports';
export * from './services';

// Export tool types
export * from './agents/tools/inferred-types';
export * from './agents/tools/types';

// Reexport AI SDK
export { createAzure } from '@ai-sdk/azure';
export {
  convertToModelMessages,
  generateText,
  streamText,
  validateUIMessages,
} from 'ai';
export type { UIMessage } from 'ai';

const baseModels = [
  {
    name: 'Phi-3 Mini (Local LLM)',
    value: 'local/Phi-3-mini-4k-instruct-q4.gguf',
  },
  {
    name: 'SmolLM2 (Local LLM)',
    value: 'local/HuggingFaceTB/SmolLM-135M',
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
  {
    name: 'Phi-3 Mini (Local)',
    value: 'local/Phi-3-mini-4k-instruct-q4.gguf',
  },
];

console.log('###################################################');
console.log('###################################################');
console.log(
  '[AgentFactorySDK] Loading... Models:',
  baseModels.map((m) => m.name),
);
console.log('###################################################');
console.log('###################################################');

export const SUPPORTED_MODELS = baseModels;
