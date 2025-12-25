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


const baseModels = [
  {
    name: 'Granite 4.0 Micro (Local)',
    value: 'llamacpp/granite-4.0-micro',
  },
];

export const SUPPORTED_MODELS = baseModels;
