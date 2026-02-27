// Export all from subdirectories
export * from './domain';
export * from './services';
export * from './agents';

// Export tool types
export * from './agents/tools/types';
export * from './agents/tools/inferred-types';

// Export config (browser-safe: skills cache only; use @qwery/agent-factory-sdk/config/node for disk loaders)
export * from './config';

// Export agent/tool registry system
export * from './tools/tool';
export * from './tools/registry';

// Export MCP client (for advanced use; Registry.tools.forAgent uses it when mcpServerUrl is set)
export {
  getMcpTools,
  type GetMcpToolsOptions,
  type GetMcpToolsResult,
} from './mcp/index.js';

// Reexport AI SDK
export type { UIMessage } from 'ai';
export {
  convertToModelMessages,
  streamText,
  generateText,
  validateUIMessages,
} from 'ai';
export { createAzure } from '@ai-sdk/azure';
export { createAnthropic } from '@ai-sdk/anthropic';

const baseModels = [
  {
    name: 'GPT-5.2',
    value: 'azure/gpt-5.2-chat',
  },
  {
    name: 'Anthropic Claude (4.5 Sonnet)',
    value: 'anthropic/claude-sonnet-4-5-20250929',
  },
  {
    name: 'DeepSeek V3.1 (671B, Ollama Cloud)',
    value: 'ollama-cloud/deepseek-v3.1:671b',
  },
  {
    name: 'Gemini 3 Flash Preview (Ollama Cloud)',
    value: 'ollama-cloud/gemini-3-flash-preview',
  },
  {
    name: 'Gemini 3 Pro Preview (Ollama Cloud)',
    value: 'ollama-cloud/gemini-3-pro-preview',
  },
  {
    name: 'GLM 5 (Ollama Cloud)',
    value: 'ollama-cloud/glm-5',
  },
  {
    name: 'GPT OSS (120B, Ollama Cloud)',
    value: 'ollama-cloud/gpt-oss:120b',
  },
  {
    name: 'Kimi K2.5 (Ollama Cloud)',
    value: 'ollama-cloud/kimi-k2.5',
  },
  {
    name: 'MiniMax M2.5 (Ollama Cloud)',
    value: 'ollama-cloud/minimax-m2.5',
  },
  {
    name: 'Mistral Large 3 (675B, Ollama Cloud)',
    value: 'ollama-cloud/mistral-large-3:675b',
  },
  {
    name: 'Qwen 3.5 (397B, Ollama Cloud)',
    value: 'ollama-cloud/qwen3.5:397b',
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
