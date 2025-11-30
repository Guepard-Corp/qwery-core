import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateText } from 'ai';
import { AiSdkModelProvider } from '../src/services/ai-sdk-model.provider';
import { MessageRole, type Message } from '../src/domain/message.type';

vi.mock('ai', () => ({
  generateText: vi.fn(),
}));

const mockGenerateText = vi.mocked(generateText);

describe('AiSdkModelProvider', () => {
  beforeEach(() => {
    mockGenerateText.mockReset();
  });

  it('invokes the AI SDK with system prompts and history', async () => {
    const provider = new AiSdkModelProvider({
      resolveModel: (name) => `openai:${name}`,
      defaultCallSettings: { maxOutputTokens: 512 },
    });

    await provider.initialize('gpt-4o-mini', false, false, {
      temperature: 0.2,
      conversationId: 'conv-1',
      agentName: 'planner',
    });

    mockGenerateText.mockResolvedValueOnce({
      text: 'Hello from AI',
    } as Awaited<ReturnType<typeof generateText>>);

    const [firstResponse] = await provider.start(
      'You are helpful',
      'Hello there',
    );

    expect(mockGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'openai:gpt-4o-mini',
        system: 'You are helpful',
        prompt: 'Hello there',
        maxOutputTokens: 512,
        temperature: 0.2,
      }),
    );

    expect(firstResponse).toMatchObject({
      conversationId: 'conv-1',
      role: MessageRole.ASSISTANT,
      content: 'Hello from AI',
    });

    const history: Message[] = [
      {
        id: 'msg-1',
        conversationId: 'conv-1',
        type: 'text',
        role: MessageRole.USER,
        content: 'Hello there',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'planner',
        updatedBy: 'planner',
      },
      {
        id: 'msg-2',
        conversationId: 'conv-1',
        type: 'text',
        role: MessageRole.ASSISTANT,
        content: 'Hello from AI',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'planner',
        updatedBy: 'planner',
      },
    ];

    mockGenerateText.mockResolvedValueOnce({
      text: 'Second response',
    } as Awaited<ReturnType<typeof generateText>>);

    const [secondResponse] = await provider.step(history, 'How many users?');

    expect(mockGenerateText).toHaveBeenLastCalledWith(
      expect.objectContaining({
        model: 'openai:gpt-4o-mini',
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'assistant',
          }),
        ]),
        temperature: 0.2,
      }),
    );

    expect(secondResponse).toMatchObject({
      conversationId: 'conv-1',
      content: 'Second response',
    });
  });
});
