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
    name: 'Cogito 2.1 (671B, Ollama Cloud)',
    value: 'ollama-cloud/cogito-2.1:671b',
  },
  {
    name: 'DeepSeek V3.1 (671B, Ollama Cloud)',
    value: 'ollama-cloud/deepseek-v3.1:671b',
  },
  {
    name: 'DeepSeek V3.2 (Ollama Cloud)',
    value: 'ollama-cloud/deepseek-v3.2',
  },
  {
    name: 'Devstral 2 (123B, Ollama Cloud)',
    value: 'ollama-cloud/devstral-2:123b',
  },
  {
    name: 'Devstral Small 2 (24B, Ollama Cloud)',
    value: 'ollama-cloud/devstral-small-2:24b',
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
    name: 'Gemma 3 (4B, Ollama Cloud)',
    value: 'ollama-cloud/gemma3:4b',
  },
  {
    name: 'Gemma 3 (12B, Ollama Cloud)',
    value: 'ollama-cloud/gemma3:12b',
  },
  {
    name: 'Gemma 3 (27B, Ollama Cloud)',
    value: 'ollama-cloud/gemma3:27b',
  },
  {
    name: 'GLM 4.6 (Ollama Cloud)',
    value: 'ollama-cloud/glm-4.6',
  },
  {
    name: 'GLM 4.7 (Ollama Cloud)',
    value: 'ollama-cloud/glm-4.7',
  },
  {
    name: 'GLM 5 (Ollama Cloud)',
    value: 'ollama-cloud/glm-5',
  },
  {
    name: 'GPT OSS (20B, Ollama Cloud)',
    value: 'ollama-cloud/gpt-oss:20b',
  },
  {
    name: 'GPT OSS (120B, Ollama Cloud)',
    value: 'ollama-cloud/gpt-oss:120b',
  },
  {
    name: 'Kimi K2 Thinking (Ollama Cloud)',
    value: 'ollama-cloud/kimi-k2-thinking',
  },
  {
    name: 'Kimi K2.5 (Ollama Cloud)',
    value: 'ollama-cloud/kimi-k2.5',
  },
  {
    name: 'Kimi K2 (1T, Ollama Cloud)',
    value: 'ollama-cloud/kimi-k2:1t',
  },
  {
    name: 'MiniMax M2 (Ollama Cloud)',
    value: 'ollama-cloud/minimax-m2',
  },
  {
    name: 'MiniMax M2.1 (Ollama Cloud)',
    value: 'ollama-cloud/minimax-m2.1',
  },
  {
    name: 'MiniMax M2.5 (Ollama Cloud)',
    value: 'ollama-cloud/minimax-m2.5',
  },
  {
    name: 'Ministral 3 (3B, Ollama Cloud)',
    value: 'ollama-cloud/ministral-3:3b',
  },
  {
    name: 'Ministral 3 (8B, Ollama Cloud)',
    value: 'ollama-cloud/ministral-3:8b',
  },
  {
    name: 'Ministral 3 (14B, Ollama Cloud)',
    value: 'ollama-cloud/ministral-3:14b',
  },
  {
    name: 'Mistral Large 3 (675B, Ollama Cloud)',
    value: 'ollama-cloud/mistral-large-3:675b',
  },
  {
    name: 'Nemotron 3 Nano (30B, Ollama Cloud)',
    value: 'ollama-cloud/nemotron-3-nano:30b',
  },
  {
    name: 'Qwen 3 Coder Next (Ollama Cloud)',
    value: 'ollama-cloud/qwen3-coder-next',
  },
  {
    name: 'Qwen 3 Coder (480B, Ollama Cloud)',
    value: 'ollama-cloud/qwen3-coder:480b',
  },
  {
    name: 'Qwen 3 Next (80B, Ollama Cloud)',
    value: 'ollama-cloud/qwen3-next:80b',
  },
  {
    name: 'Qwen 3 VL (235B, Ollama Cloud)',
    value: 'ollama-cloud/qwen3-vl:235b',
  },
  {
    name: 'Qwen 3 VL Instruct (235B, Ollama Cloud)',
    value: 'ollama-cloud/qwen3-vl:235b-instruct',
  },
  {
    name: 'Qwen 3.5 (397B, Ollama Cloud)',
    value: 'ollama-cloud/qwen3.5:397b',
  },
  {
    name: 'RNJ 1 (8B, Ollama Cloud)',
    value: 'ollama-cloud/rnj-1:8b',
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
