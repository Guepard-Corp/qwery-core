import {
  MLCEngine,
  type InitProgressCallback,
  type MLCEngineInterface,
} from '@mlc-ai/web-llm';
import { AiSdkModelProvider } from './ai-sdk-model.provider';

export type WebLLMModelProviderOptions = {
  defaultModel?: string;
  defaultTemperature?: number;
  initProgressCallback?: InitProgressCallback;
};

// Map of model names to engine instances
const engineCache = new Map<string, MLCEngineInterface>();
const enginePromises = new Map<string, Promise<MLCEngineInterface>>();

async function getOrCreateEngine(
  modelName: string,
  initProgressCallback?: InitProgressCallback,
): Promise<MLCEngineInterface> {
  if (engineCache.has(modelName)) {
    return engineCache.get(modelName)!;
  }

  if (enginePromises.has(modelName)) {
    return enginePromises.get(modelName)!;
  }

  const promise = (async () => {
    const engine = new MLCEngine();
    if (initProgressCallback) {
      engine.setInitProgressCallback(initProgressCallback);
    }
    await engine.reload(modelName);
    engineCache.set(modelName, engine);
    enginePromises.delete(modelName);
    return engine;
  })();

  enginePromises.set(modelName, promise);
  return promise;
}

// Create an AI SDK-compatible model adapter for WebLLM
// The AI SDK expects models with specific methods, so we create a custom model object
function createWebLLMModel(
  modelName: string,
  temperature: number,
  initProgressCallback?: InitProgressCallback,
) {
  // Create a model-like object that the AI SDK can use
  // The AI SDK will call doGenerate internally
  const model = {
    provider: 'custom' as const,
    doStream: false as const,
    doGenerate: async (options: {
      inputFormat: 'messages';
      messages: Array<{
        role: 'system' | 'user' | 'assistant';
        content: string;
      }>;
      temperature?: number;
      maxTokens?: number;
    }) => {
      const engine = await getOrCreateEngine(modelName, initProgressCallback);
      const response = await engine.chat.completions.create({
        messages: options.messages,
        temperature: options.temperature ?? temperature,
        max_tokens: options.maxTokens,
        stream: false,
      });

      const content = response.choices[0]?.message?.content ?? '';
      const finishReason = response.choices[0]?.finish_reason;

      return {
        text: content,
        finishReason: finishReason === 'stop' ? 'stop' : 'length',
        usage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
        },
        response: {
          id: response.id || `webllm-${Date.now()}`,
          model: modelName,
          choices: [
            {
              message: {
                role: 'assistant' as const,
                content,
              },
              finish_reason: finishReason ?? 'stop',
            },
          ],
        },
      };
    },
  };

  return model as never;
}

export function createWebLLMModelProvider(
  options: WebLLMModelProviderOptions = {},
): AiSdkModelProvider {
  const defaultModel =
    options.defaultModel || 'Llama-3.1-8B-Instruct-q4f32_1-MLC';
  const defaultTemperature = options.defaultTemperature ?? 0.7;
  const initProgressCallback = options.initProgressCallback;

  return new AiSdkModelProvider({
    resolveModel: (modelName) => {
      const finalModel = modelName || defaultModel;
      if (!finalModel) {
        throw new Error(
          "[AgentFactory] Missing WebLLM model. Provide it as 'webllm/<model-name>' or set WEBLLM_MODEL.",
        );
      }
      return createWebLLMModel(
        finalModel,
        defaultTemperature,
        initProgressCallback,
      );
    },
    defaultCallSettings: {
      temperature: defaultTemperature,
    },
  });
}
