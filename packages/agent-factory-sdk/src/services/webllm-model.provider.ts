import {
  MLCEngine,
  type InitProgressCallback,
  type MLCEngineInterface,
} from '@mlc-ai/web-llm';
import { LanguageModel } from 'ai';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { AGENT_EVENTS } from '@qwery/telemetry';
import {
  createLLMSpanAttributes,
  createLLMAttributes,
} from '@qwery/telemetry/otel/agent-helpers';

type ModelProvider = {
  resolveModel: (modelName: string) => LanguageModel;
};

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
      const tracer = trace.getTracer('agent-factory-sdk');
      const spanAttributes = createLLMSpanAttributes(modelName, 'webllm', {
        temperature: options.temperature ?? temperature,
        maxTokens: options.maxTokens || 0,
      });
      const span = tracer.startSpan('agent.llm.call', {
        attributes: spanAttributes,
      });

      try {
        const startEventAttributes = createLLMAttributes(modelName, 'webllm');
        span.addEvent(AGENT_EVENTS.LLM_CALL_STARTED, startEventAttributes);

        const startTime = Date.now();
        const engine = await getOrCreateEngine(modelName, initProgressCallback);
        const response = await engine.chat.completions.create({
          messages: options.messages,
          temperature: options.temperature ?? temperature,
          max_tokens: options.maxTokens,
          stream: false,
        });

        const duration = Date.now() - startTime;
        const content = response.choices[0]?.message?.content ?? '';
        const finishReason = response.choices[0]?.finish_reason;

        // Extract token usage if available
        const promptTokens = response.usage?.prompt_tokens || 0;
        const completionTokens = response.usage?.completion_tokens || 0;
        const totalTokens = response.usage?.total_tokens || 0;

        const completionAttributes = createLLMAttributes(modelName, 'webllm');
        span.setAttributes({
          ...completionAttributes,
          'agent.llm.prompt.tokens': promptTokens,
          'agent.llm.completion.tokens': completionTokens,
          'agent.llm.total.tokens': totalTokens,
          'agent.llm.duration_ms': String(duration),
          'agent.llm.status': 'success',
        });

        const completedEventAttributes = createLLMAttributes(
          modelName,
          'webllm',
        );
        span.addEvent(AGENT_EVENTS.LLM_CALL_COMPLETED, {
          ...completedEventAttributes,
          'agent.llm.duration_ms': String(duration),
        });

        if (totalTokens > 0) {
          const tokensEventAttributes = createLLMAttributes(
            modelName,
            'webllm',
          );
          span.addEvent(AGENT_EVENTS.LLM_TOKENS_USED, {
            ...tokensEventAttributes,
            'agent.llm.prompt.tokens': promptTokens,
            'agent.llm.completion.tokens': completionTokens,
            'agent.llm.total.tokens': totalTokens,
          });
        }

        span.setStatus({ code: SpanStatusCode.OK });
        span.end();

        return {
          text: content,
          finishReason: finishReason === 'stop' ? 'stop' : 'length',
          usage: {
            promptTokens,
            completionTokens,
            totalTokens,
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
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const errorAttributes = createLLMAttributes(modelName, 'webllm');
        span.setAttributes({
          ...errorAttributes,
          'agent.llm.status': 'error',
          'error.type': error instanceof Error ? error.name : 'UnknownError',
          'error.message': errorMessage,
        });

        span.addEvent(AGENT_EVENTS.LLM_CALL_ERROR, {
          ...errorAttributes,
          'error.message': errorMessage,
        });

        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: errorMessage,
        });
        span.end();

        throw error;
      }
    },
  };

  return model as never;
}

export function createWebLLMModelProvider(
  options: WebLLMModelProviderOptions = {},
): ModelProvider {
  const defaultModel =
    options.defaultModel || 'Llama-3.1-8B-Instruct-q4f32_1-MLC';
  const defaultTemperature = options.defaultTemperature ?? 0.7;
  const initProgressCallback = options.initProgressCallback;

  return {
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
  };
}
