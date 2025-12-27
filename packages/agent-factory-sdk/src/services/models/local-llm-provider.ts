import { LanguageModel } from 'ai';

type ModelProvider = {
  resolveModel: (modelName: string) => LanguageModel;
};

export type LocalLLMProviderOptions = {
  baseUrl?: string;
  defaultModel?: string;
};

export function createLocalLLMProvider({
  baseUrl = process.env.LOCAL_LLM_BASE_URL || 'http://localhost:8081',
  defaultModel = process.env.LOCAL_LLM_MODEL || 'tinyllama-1.1b-chat',
}: LocalLLMProviderOptions = {}): ModelProvider {
  
  const createLocalLLM = (modelId: string): LanguageModel => {
    return {
      specificationVersion: 'v2',
      provider: 'local-llm',
      modelId,
      defaultObjectGenerationMode: 'json',

      doGenerate: async (options: any) => {  // ← Added : any
        const response = await fetch(`${baseUrl}/v1/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: modelId,
            messages: options.prompt,
            temperature: options.temperature ?? 0.7,
            max_tokens: options.maxTokens ?? 2000,
            stream: false,
          }),
        });

        if (!response.ok) {
          throw new Error(`Local LLM error: ${response.status} ${await response.text()}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';

        return {
          text: content,
          finishReason: data.choices?.[0]?.finish_reason || 'stop',
          usage: {
            promptTokens: data.usage?.prompt_tokens || 0,
            completionTokens: data.usage?.completion_tokens || 0,
          },
          rawResponse: {
            headers: Object.fromEntries(response.headers.entries()),
          },
        };
      },

      doStream: async (options: any) => {  // ← Added : any
        const response = await fetch(`${baseUrl}/v1/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: modelId,
            messages: options.prompt,
            temperature: options.temperature ?? 0.7,
            max_tokens: options.maxTokens ?? 2000,
            stream: true,
          }),
        });

        if (!response.ok) {
          throw new Error(`Local LLM error: ${response.status} ${await response.text()}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        return {
          stream: (async function* () {
            if (!reader) return;

            let buffer = '';
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                  if (line.startsWith('data: ')) {
                    const data = line.slice(6).trim();
                    if (data === '[DONE]') return;

                    try {
                      const parsed = JSON.parse(data);
                      const delta = parsed.choices?.[0]?.delta?.content;
                      if (delta) {
                        yield {
                          type: 'text-delta',
                          textDelta: delta,
                        };
                      }

                      const finishReason = parsed.choices?.[0]?.finish_reason;
                      if (finishReason) {
                        yield {
                          type: 'finish',
                          finishReason,
                          usage: {
                            promptTokens: parsed.usage?.prompt_tokens || 0,
                            completionTokens: parsed.usage?.completion_tokens || 0,
                          },
                        };
                      }
                    } catch {
                      // Skip invalid JSON
                    }
                  }
                }
              }
            } finally {
              reader.releaseLock();
            }
          })(),
          rawResponse: {
            headers: Object.fromEntries(response.headers.entries()),
          },
        };
      },
    } as unknown as LanguageModel;
  };

  return {
    resolveModel: (modelName) => {
      const finalModel = modelName || defaultModel;
      if (!finalModel) {
        throw new Error(
          "[AgentFactory] Missing Local LLM model. Provide it as 'local-llm/<model-name>' or set LOCAL_LLM_MODEL.",
        );
      }
      return createLocalLLM(finalModel);
    },
  };
}