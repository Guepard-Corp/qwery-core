export type LocalLLMBackend = 'vllm' | 'llamacpp';

export interface LocalLLMConfig {
  backend: LocalLLMBackend;
  baseUrl: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
}

export interface PromptMessage {
  role: 'system' | 'user' | 'assistant';
  content: Array<{ type: 'text'; text: string }>;
}

export interface Prompt {
  system?: string;
  messages?: PromptMessage[];
}
