import {
  BaseChatModel,
  type BaseChatModelParams,
} from '@langchain/core/language_models/chat_models';
import {
  BaseMessage,
  HumanMessage,
  AIMessage,
  ChatMessage,
  SystemMessage,
} from '@langchain/core/messages';
import { ChatGeneration, ChatResult } from '@langchain/core/outputs';
import {
  MLCEngine,
  MLCEngineInterface,
  InitProgressCallback,
} from '@mlc-ai/web-llm';

export interface WebLLMChatModelParams extends BaseChatModelParams {
  model?: string;
  temperature?: number;
  initProgressCallback?: InitProgressCallback;
}

/**
 * A LangChain ChatModel wrapper for MLCEngine (WebLLM)
 * Uses MLCEngine directly like browser-chat-transport for reliable model loading
 */
export class WebLLMChatModel extends BaseChatModel {
  private engine: MLCEngineInterface | null = null;
  private enginePromise: Promise<MLCEngineInterface> | null = null;
  private model: string;
  private temperature: number;
  private initProgressCallback?: InitProgressCallback;

  constructor(params: WebLLMChatModelParams = {}) {
    super(params);
    this.model = params.model || 'Llama-3.1-8B-Instruct-q4f32_1';
    this.temperature = params.temperature ?? 0.7;
    this.initProgressCallback = params.initProgressCallback;
  }

  private async getEngine(): Promise<MLCEngineInterface> {
    if (this.engine) {
      return this.engine;
    }

    if (this.enginePromise) {
      return this.enginePromise;
    }

    // Initialize engine and load model explicitly
    this.enginePromise = (async () => {
      const engine = new MLCEngine();
      if (this.initProgressCallback) {
        engine.setInitProgressCallback(this.initProgressCallback);
      }
      // Explicitly reload the model - this is what makes it work
      await engine.reload(this.model);
      this.engine = engine;
      return engine;
    })();

    return this.enginePromise;
  }

  _llmType(): string {
    return 'webllm';
  }

  async _generate(
    messages: BaseMessage[],
    _options?: this['ParsedCallOptions'],
  ): Promise<ChatResult> {
    const engine = await this.getEngine();

    // Convert LangChain messages to web-llm format
    const chatHistory: Array<{
      role: 'system' | 'user' | 'assistant';
      content: string;
    }> = [];

    for (const msg of messages) {
      if (msg instanceof SystemMessage) {
        chatHistory.push({
          role: 'system',
          content: msg.content as string,
        });
      } else if (msg instanceof HumanMessage) {
        chatHistory.push({
          role: 'user',
          content: msg.content as string,
        });
      } else if (msg instanceof AIMessage) {
        chatHistory.push({
          role: 'assistant',
          content: msg.content as string,
        });
      } else if (msg instanceof ChatMessage) {
        // Map ChatMessage role to web-llm role
        const role =
          msg.role === 'ai'
            ? 'assistant'
            : msg.role === 'human'
              ? 'user'
              : 'system';
        chatHistory.push({
          role: role as 'system' | 'user' | 'assistant',
          content: msg.content as string,
        });
      }
    }

    // Generate response using MLCEngine
    const response = await engine.chat.completions.create({
      messages: chatHistory as Array<{
        role: 'system' | 'user' | 'assistant';
        content: string;
      }>,
      temperature: this.temperature,
      stream: false,
    });

    // Extract the response content
    const content = response.choices[0]?.message?.content || '';

    // Create AIMessage with the response
    const aiMessage = new AIMessage({
      content,
    });

    // Handle tool calls if present
    const toolCalls = response.choices[0]?.message?.tool_calls;
    if (toolCalls && toolCalls.length > 0) {
      aiMessage.tool_calls = toolCalls.map(
        (tc: {
          id?: string;
          function?: { name?: string; arguments?: string };
        }) => ({
          name: tc.function?.name || '',
          args: JSON.parse(tc.function?.arguments || '{}'),
          id: tc.id || `call_${Date.now()}_${Math.random()}`,
        }),
      );
    }

    const generation: ChatGeneration = {
      message: aiMessage,
      text: content,
    };

    return {
      generations: [generation],
    };
  }
}
