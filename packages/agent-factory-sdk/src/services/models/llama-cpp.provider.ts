import { type LanguageModel } from 'ai';

type ModelProvider = {
  resolveModel: (modelName: string) => LanguageModel;
};

type LlamaCppProviderOptions = {
  baseUrl: string;
  defaultModel: string;
};

function truncateToWords(text: string, maxWords: number): string {
  const words = text.split(/\s+/);
  return words.length <= maxWords ? text : words.slice(0, maxWords).join(' ');
}

// Normalize prompt messages coming from AI SDK / Qwery
function normalizePrompt(prompt: any[]): { role: string; content: string }[] {
  return prompt
    .map((msg) => {
      // Case 1: string content
      if (typeof msg.content === 'string') {
        return { role: msg.role ?? 'user', content: msg.content };
      }

      // Case 2: array content with text parts
      if (Array.isArray(msg.content)) {
        const text = msg.content
          .filter((p: any) => p.type === 'text' && typeof p.text === 'string')
          .map((p: any) => p.text)
          .join('\n');

        if (text) {
          return { role: msg.role ?? 'user', content: text };
        }
      }

      return null;
    })
    .filter(Boolean) as { role: string; content: string }[];
}

export function createLlamaCppModelProvider(
  providerOptions: LlamaCppProviderOptions,
): ModelProvider {
  console.log('🔷 createLlamaCppModelProvider called with:', providerOptions);
  return {
    resolveModel(modelName: string): LanguageModel {
      console.log('🔷 resolveModel called with:', modelName);
      const modelId = modelName || providerOptions.defaultModel;
      console.log('🔷 Using modelId:', modelId);

      const llamaCppModel = {
        specificationVersion: 'v2',
        provider: 'llama.cpp',
        modelId,
        supportedUrls: {},

        async doGenerate(options: any) {
          console.log('🔵 doGenerate called!');
          const temperature = options.temperature ?? 0.2;
          const maxTokens = 64; // REDUCED from 128 to leave more room for prompt

          let messages: { role: string; content: string }[] = [];

          if (Array.isArray(options.prompt)) {
            const normalized = normalizePrompt(options.prompt);

            const systemMessage = normalized.find(
              (m) => m.role === 'system',
            );

            const userMessage = [...normalized]
              .reverse()
              .find((m) => m.role === 'user');

            // CRITICAL: Drastically truncate to fit in 2048 token context
            if (systemMessage) {
              messages.push({
                role: 'system',
                content: truncateToWords(systemMessage.content, 30), // REDUCED from 100 to 30
              });
            }

            if (userMessage) {
              messages.push({
                role: 'user',
                content: truncateToWords(userMessage.content, 20), // ADDED truncation for user message
              });
            }
          }
          
          console.log('📤 Sending to llama.cpp:', JSON.stringify(messages, null, 2));
          
          const response = await fetch(
            `${providerOptions.baseUrl}/v1/chat/completions`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model: modelId,
                messages,
                temperature,
                max_tokens: maxTokens,
                stream: false,
              }),
            },
          );

          if (!response.ok) {
            const errorText = await response.text();
            console.error('LLM ERROR:', errorText);

            return {
              text: '⚠️ Local model failed to answer due to context or resource limits.',
              finishReason: 'error',
              usage: { promptTokens: 0, completionTokens: 0 },
              rawCall: {
                rawPrompt: messages,
                rawSettings: { temperature, maxTokens },
              },
            };
          }

          const data = await response.json();
          const generatedText = data.choices?.[0]?.message?.content ?? '';

          console.log('\n===== LLM OUTPUT =====');
          console.log(generatedText);
          console.log('======================\n');

          return {
            text: generatedText.trim(),
            finishReason: data.choices?.[0]?.finish_reason ?? 'stop',
            usage: {
              promptTokens: data.usage?.prompt_tokens ?? 0,
              completionTokens: data.usage?.completion_tokens ?? 0,
            },
            rawCall: {
              rawPrompt: messages,
              rawSettings: { temperature, maxTokens },
            },
          };
        },

        async doStream(options: any) {
          const result = await (llamaCppModel as any).doGenerate(options);

          async function* stream() {
            yield result.text;
          }

          return stream();
        },
      };

      return llamaCppModel as unknown as LanguageModel;
    },
  };
}