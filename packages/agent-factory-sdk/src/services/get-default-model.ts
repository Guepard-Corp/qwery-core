/**
 * Get the default model from environment configuration.
 * This provides a centralized way to determine which model should be used
 * when no specific model is provided.
 * 
 * Priority:
 * 1. AGENT_PROVIDER + LOCAL_LLM_MODEL (for local-llm provider)
 * 2. Falls back to 'local-llm/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf'
 */
export function getDefaultModel(): string {
  const getEnv = (key: string): string | undefined => {
    if (typeof process !== 'undefined' && process.env) {
      return process.env[key];
    }
    return undefined;
  };

  const provider = getEnv('AGENT_PROVIDER') || getEnv('VITE_AGENT_PROVIDER') || 'local-llm';
  
  if (provider === 'local-llm') {
    const modelName = getEnv('LOCAL_LLM_MODEL') || getEnv('VITE_LOCAL_LLM_MODEL') || 'tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf';
    return `local-llm/${modelName}`;
  }
  
  if (provider === 'azure') {
    const deployment = getEnv('AZURE_OPENAI_DEPLOYMENT') || 'gpt-5-mini';
    return `azure/${deployment}`;
  }
  
  if (provider === 'ollama') {
    const modelName = getEnv('OLLAMA_MODEL') || 'llama3';
    return `ollama/${modelName}`;
  }

  // Fallback to local-llm with default model
  return 'local-llm/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf';
}
