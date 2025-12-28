export function getDefaultModel(): string {
  // Server-side: use process.env (no VITE_ prefix needed)
  // Client-side: use import.meta.env (requires VITE_ prefix)
  let provider = 'local-llm';
  let modelName = 'tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf';

  if (typeof process !== 'undefined' && process.env) {
    // Server-side: check both with and without VITE_ prefix
    provider = process.env.AGENT_PROVIDER || process.env.VITE_AGENT_PROVIDER || provider;
    modelName = process.env.LOCAL_LLM_MODEL || process.env.VITE_LOCAL_LLM_MODEL || modelName;
  } else if (typeof import.meta !== 'undefined' && import.meta.env) {
    // Client-side: must use VITE_ prefix
    provider = import.meta.env.VITE_AGENT_PROVIDER || provider;
    modelName = import.meta.env.VITE_LOCAL_LLM_MODEL || modelName;
  }

  return `${provider}/${modelName}`;
}

