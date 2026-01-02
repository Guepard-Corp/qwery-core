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

type SupportedModel = {
  id?: string;
  name: string;
  value: string;
  provider?: string;
  description?: string;
};

const baseModels: SupportedModel[] = [
  {
    id: 'llamacpp/mistral-7b-instruct-v0.2.Q2_K.gguf',
    name: 'Mistral 7B Instruct (Local)',
    value: 'llamacpp/mistral-7b-instruct-v0.2.Q2_K.gguf',
    provider: 'llamacpp',
    description: 'Local Mistral 7B model running via llama.cpp',
  },
  {
    id: 'azure/gpt-5-mini',
    name: 'GPT-5 Mini',
    value: 'azure/gpt-5-mini',
    provider: 'azure',
    description: 'Azure OpenAI GPT-5 Mini deployment',
  },
  {
    id: 'ollama/deepseek-r1:8b',
    name: 'DeepSeek R1 (8B)',
    value: 'ollama/deepseek-r1:8b',
    provider: 'ollama',
    description: 'Local DeepSeek R1 via Ollama',
  },
  {
    id: 'webllm/Llama-3.1-8B-Instruct-q4f32_1-MLC',
    name: 'Llama 3.1 (8B)',
    value: 'webllm/Llama-3.1-8B-Instruct-q4f32_1-MLC',
    provider: 'webllm',
    description: 'WebLLM hosted Llama 3.1 8B',
  },
  {
    id: 'transformer-browser/SmolLM2-360M-Instruct',
    name: 'SmolLM2 (360M)',
    value: 'transformer-browser/SmolLM2-360M-Instruct',
    provider: 'transformer-browser',
    description: 'Transformer.js in-browser SmolLM2 360M',
  },
  {
    id: 'browser/built-in',
    name: 'Built-in Browser',
    value: 'browser/built-in',
    provider: 'browser',
    description: 'Minimal built-in browser-only model',
  },
];

export const SUPPORTED_MODELS = baseModels;
