import { ChatTransport, UIMessage, UIMessageChunk } from 'ai';
import {
  MLCEngine,
  MLCEngineInterface,
  InitProgressCallback,
} from '@mlc-ai/web-llm';

export interface BrowserChatTransportOptions {
  model?: string;
  initProgressCallback?: InitProgressCallback;
}

export class BrowserChatTransport<UI_MESSAGE extends UIMessage>
  implements ChatTransport<UI_MESSAGE>
{
  private engine: MLCEngineInterface | null = null;
  private enginePromise: Promise<MLCEngineInterface> | null = null;
  private model: string;
  private initProgressCallback?: InitProgressCallback;

  constructor(options: BrowserChatTransportOptions = {}) {
    this.model = options.model || 'Llama-3.1-8B-Instruct-q4f32_1';
    this.initProgressCallback = options.initProgressCallback;
  }

  private async getEngine(): Promise<MLCEngineInterface> {
    if (this.engine) {
      return this.engine;
    }

    if (this.enginePromise) {
      return this.enginePromise;
    }

    this.enginePromise = (async () => {
      const engine = new MLCEngine();
      if (this.initProgressCallback) {
        engine.setInitProgressCallback(this.initProgressCallback);
      }
      await engine.reload(this.model);
      this.engine = engine;
      return engine;
    })();

    return this.enginePromise;
  }

  async sendMessages({
    trigger: _trigger,
    chatId: _chatId,
    messageId,
    messages,
    abortSignal,
    body,
  }: Parameters<ChatTransport<UI_MESSAGE>['sendMessages']>[0]): Promise<
    ReadableStream<UIMessageChunk>
  > {
    const model = (body as { model?: string })?.model || this.model;

    // Update model if different
    if (model !== this.model) {
      this.model = model;
      this.engine = null;
      this.enginePromise = null;
    }

    const engine = await this.getEngine();

    // Convert UI messages to chat format
    const chatHistory: Array<{
      role: 'system' | 'user' | 'assistant';
      content: string;
    }> = [];

    for (const msg of messages) {
      const textParts = msg.parts
        .filter((part) => part.type === 'text')
        .map((part) => part.text)
        .join('\n');

      if (textParts) {
        chatHistory.push({
          role:
            msg.role === 'system'
              ? 'system'
              : msg.role === 'assistant'
                ? 'assistant'
                : 'user',
          content: textParts,
        });
      }
    }

    // Create a readable stream
    const messageIdGenerated =
      messageId || `msg-${Date.now()}-${Math.random()}`;

    const stream = new ReadableStream<UIMessageChunk>({
      async start(controller) {
        try {
          // Emit start chunk
          controller.enqueue({
            type: 'start',
            messageId: messageIdGenerated,
          } as UIMessageChunk);

          // Emit text-start chunk
          controller.enqueue({
            type: 'text-start',
            id: messageIdGenerated,
          } as UIMessageChunk);

          // Generate response using web-llm
          const response = await engine.chat.completions.create({
            messages: chatHistory as Array<{
              role: 'system' | 'user' | 'assistant';
              content: string;
            }>,
            stream: true,
            stream_options: { include_usage: true },
          });

          // Stream the response
          let finishReason: 'stop' | 'length' | 'tool_calls' | 'abort' = 'stop';

          for await (const chunk of response) {
            if (abortSignal?.aborted) {
              finishReason = 'abort';
              // Try to interrupt generation
              if (engine.interruptGenerate) {
                try {
                  await engine.interruptGenerate();
                } catch {
                  // Ignore errors during interrupt
                }
              }
              controller.close();
              return;
            }

            const content = chunk.choices[0]?.delta?.content || '';
            const chunkFinishReason = chunk.choices[0]?.finish_reason;

            if (chunkFinishReason) {
              finishReason =
                chunkFinishReason === 'length'
                  ? 'length'
                  : chunkFinishReason === 'tool_calls'
                    ? 'tool_calls'
                    : 'stop';
            }

            if (content) {
              controller.enqueue({
                type: 'text-delta',
                delta: content,
                id: messageIdGenerated,
              } as UIMessageChunk);
            }
          }

          // Emit text-end chunk
          controller.enqueue({
            type: 'text-end',
            id: messageIdGenerated,
          } as UIMessageChunk);

          // Emit finish chunk
          controller.enqueue({
            type: 'finish',
            finishReason: finishReason,
          } as UIMessageChunk);

          controller.close();
        } catch (error) {
          controller.enqueue({
            type: 'error',
            errorText:
              error instanceof Error ? error.message : 'Unknown error occurred',
          } as UIMessageChunk);
          controller.close();
        }
      },
    });

    return stream;
  }

  async reconnectToStream({
    chatId: _chatId,
  }: Parameters<
    ChatTransport<UI_MESSAGE>['reconnectToStream']
  >[0]): Promise<ReadableStream<UIMessageChunk> | null> {
    // Browser-based transport doesn't support reconnection
    // since there's no persistent server-side stream
    return null;
  }
}
