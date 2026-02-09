import {
  type ChatTransport,
  type UIMessage,
  type UIMessageChunk,
  validateUIMessages,
} from 'ai';
import { FactoryAgent } from '../agents/factory-agent';
import { Repositories } from '@qwery/domain/repositories';
import { getLogger } from '@qwery/shared/logger';

type BrowserTransportOptions = {
  conversationSlug: string;
  model: string;
  repositories: Repositories;
};

export class BrowserChatTransport implements ChatTransport<UIMessage> {
  private modelName: string;
  private repositories: Repositories;
  private conversationSlug: string;
  private agent: FactoryAgent | null;

  constructor(options: BrowserTransportOptions) {
    this.modelName = options.model;
    this.repositories = options.repositories;
    this.conversationSlug = options.conversationSlug;
    this.agent = null as unknown as FactoryAgent;
  }

  private async getAgent(): Promise<FactoryAgent> {
    if (!this.agent) {
      this.agent = await FactoryAgent.create({
        conversationSlug: this.conversationSlug,
        model: this.modelName,
        repositories: this.repositories,
      });
    }
    return this.agent;
  }

  async sendMessages(
    args: Parameters<ChatTransport<UIMessage>['sendMessages']>[0],
  ): Promise<ReadableStream<UIMessageChunk>> {
    const { messages, body } = args;
    const validated = await validateUIMessages({ messages });
    const bodyDatasources = body?.datasources as string[] | undefined;
    const messagesToSend =
      bodyDatasources?.length &&
      validated.length > 0
        ? (() => {
            const lastIdx = validated.findLastIndex(
              (m) => m.role === 'user',
            );
            if (lastIdx < 0) return validated;
            const last = validated[lastIdx];
            if (!last) return validated;
            const updated = [...validated];
            updated[lastIdx] = {
              ...last,
              metadata: {
                ...(last.metadata as Record<string, unknown>),
                datasources: bodyDatasources,
              },
            };
            return updated;
          })()
        : validated;

    const agent = await this.getAgent();
    const response = await agent.respond({
      messages: messagesToSend,
    });

    if (!response.body) {
      throw new Error('Agent returned no response body');
    }

    // Parse SSE stream from response body and convert to UIMessageChunk stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    return new ReadableStream<UIMessageChunk>({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              controller.close();
              break;
            }

            buffer += decoder.decode(value, { stream: true });

            // Parse SSE format (data: {...}\n\n or data: {...}\n)
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer

            for (const line of lines) {
              if (!line.trim() || line.startsWith(':')) {
                continue; // Skip empty lines and comments
              }

              if (line.startsWith('data: ')) {
                const data = line.slice(6).trim(); // Remove 'data: ' prefix

                if (data === '[DONE]') {
                  continue;
                }

                try {
                  const parsed = JSON.parse(data) as UIMessageChunk;
                  controller.enqueue(parsed);
                } catch (parseError) {
                  // Skip invalid JSON
                  const logger = await getLogger();
                  logger.warn('Failed to parse SSE data:', data, parseError);
                }
              }
            }
          }
        } catch (error) {
          controller.error(error);
        } finally {
          reader.releaseLock();
        }
      },
    });
  }

  async reconnectToStream(): Promise<ReadableStream<UIMessageChunk> | null> {
    // Browser transport doesn't support reconnection
    return null;
  }

  /**
   * Stop the agent and cancel any ongoing processing.
   * This should be called on page refresh/unmount.
   */
  async stop(): Promise<void> {
    if (this.agent) {
      this.agent.stop();
      this.agent = null;
    }
  }
}

export function createBrowserTransport(
  options: BrowserTransportOptions,
): ChatTransport<UIMessage> {
  return new BrowserChatTransport(options);
}
