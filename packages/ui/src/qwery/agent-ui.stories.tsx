import type { Meta, StoryObj } from '@storybook/react';
import { ChatTransport, UIMessage, UIMessageChunk } from 'ai';
import QweryAgentUI from './agent-ui';

// Mock transport for Storybook that simulates AI responses
class MockChatTransport implements ChatTransport<UIMessage> {
  async sendMessages({
    messageId,
  }: Parameters<ChatTransport<UIMessage>['sendMessages']>[0]): Promise<
    ReadableStream<UIMessageChunk>
  > {
    const messageIdGenerated =
      messageId || `msg-${Date.now()}-${Math.random()}`;
    const responses: string[] = [
      "Hello! I'm a mock AI assistant. How can I help you today?",
      "I understand you're testing the agent UI. This is a simulated response!",
      'The transport is mocked, so no actual model is running.',
    ];
    const randomIndex = Math.floor(Math.random() * responses.length);
    const response = responses[randomIndex]!;

    const stream = new ReadableStream<UIMessageChunk>({
      async start(controller) {
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

        // Stream the response character by character for visual effect
        for (let i = 0; i < response.length; i++) {
          await new Promise((resolve) => setTimeout(resolve, 20));
          controller.enqueue({
            type: 'text-delta',
            delta: response[i],
            id: messageIdGenerated,
          } as UIMessageChunk);
        }

        // Emit text-end
        controller.enqueue({
          type: 'text-end',
          id: messageIdGenerated,
        } as UIMessageChunk);

        // Emit finish chunk
        controller.enqueue({
          type: 'finish',
          finishReason: 'stop',
        } as UIMessageChunk);

        controller.close();
      },
    });

    return stream;
  }

  async reconnectToStream(): Promise<ReadableStream<UIMessageChunk> | null> {
    return null;
  }
}

const meta: Meta<typeof QweryAgentUI> = {
  title: 'Qwery/Agent UI',
  component: QweryAgentUI,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof QweryAgentUI>;

export const Default: Story = {
  render: () => <QweryAgentUI transport={new MockChatTransport()} />,
};
