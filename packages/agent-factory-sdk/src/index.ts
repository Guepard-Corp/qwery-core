import { azure } from '@ai-sdk/azure';

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

export const getDefaultModel = () => {
  const hasAzureKey =
    !!(process.env.AZURE_API_KEY && process.env.AZURE_RESOURCE_NAME && process.env.AZURE_OPENAI_DEPLOYMENT);

  return hasAzureKey
    ? 'azure/gpt-5-mini'
    : 'ollama/'+(process.env.OLLAMA_MODEL || 'llama3.2');
};

const baseModels = [
  {
    name: 'GPT-5 Mini',
    value: 'azure/gpt-5-mini',
  },
  {
    name: 'Llama 3.2 (Ollama)',
    value: 'ollama/'+(process.env.OLLAMA_MODEL || 'llama3.2'),
  },
  {
    name: 'Llama 3.1 (WebLLM)',
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

