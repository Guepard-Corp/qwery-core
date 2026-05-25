import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { LLMProvider } from '@qwery/domain';

/**
 * The eval model, resolved from env so the suite runs against any
 * OpenAI-compatible endpoint the project supports. Defaults to a local Ollama;
 * point `QWERY_EVAL_BASE_URL` / `QWERY_EVAL_MODEL` at Groq/Cerebras/etc. to run
 * the same scenarios against a hosted model.
 */
export interface EvalModel {
  provider: LLMProvider;
  baseURL: string;
  model: string;
  label: string;
}

export function evalModel(): EvalModel {
  const baseURL = process.env.QWERY_EVAL_BASE_URL ?? 'http://localhost:11434/v1';
  const model = process.env.QWERY_EVAL_MODEL ?? 'qwen3-coder:30b';
  const apiKey = process.env.QWERY_EVAL_API_KEY ?? 'ollama';
  const languageModel = createOpenAICompatible({ name: 'qwery-eval', baseURL, apiKey }).chatModel(model);
  return {
    provider: { getModel: () => languageModel as unknown as ReturnType<LLMProvider['getModel']> },
    baseURL,
    model,
    label: `${model} @ ${baseURL}`,
  };
}

/** Best-effort reachability via the OpenAI-compatible `/models` endpoint. */
export async function isReachable(baseURL: string): Promise<boolean> {
  try {
    const res = await fetch(`${baseURL.replace(/\/$/, '')}/models`, { signal: AbortSignal.timeout(2500) });
    return res.ok;
  } catch {
    return false;
  }
}
