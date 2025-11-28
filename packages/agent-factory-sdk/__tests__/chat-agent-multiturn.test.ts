import { describe, expect, it } from 'vitest';
import { type UIMessage } from 'ai';
import { MockLanguageModelV2, simulateReadableStream } from 'ai/test';
import {
  MockAgentSideEffects,
  MockAgentWorkspace,
  MockAgentMemory,
  MockAIModel,
} from './mocks/agent.mock';
import { AgentFactory } from '../src/services/agent-factory';

describe('ChatAgentMultiturn', () => {
  describe('Agent Factory', () => {
    it('runs a simple one turn conversation agent', async () => {
      const sideEffects = new MockAgentSideEffects();
      const factory = new AgentFactory({
        aiModelPort: new MockAIModel(),
        memory: new MockAgentMemory(),
        workspace: new MockAgentWorkspace(),
        sideEffects,
      });

      // Use MockLanguageModelV2 from ai/test
      const mockModel = new MockLanguageModelV2({
        doStream: async () => ({
          stream: simulateReadableStream({
            chunks: [
              { type: 'text-start', id: 'text-1' },
              { type: 'text-delta', id: 'text-1', delta: 'Hello' },
              { type: 'text-end', id: 'text-1' },
              {
                type: 'finish',
                finishReason: 'stop',
                logprobs: undefined,
                usage: { inputTokens: 3, outputTokens: 5, totalTokens: 8 },
              },
            ],
          }),
        }),
      });

      const agent = factory.buildAgent({
        name: 'planner',
        system: 'You are a helpful assistant that can answer questions.',
        model: mockModel as never,
      });

      const answer = await agent.run([
        {
          id: 'user-1',
          role: 'user',
          parts: [{ type: 'text', text: 'Hi agent' }],
        },
      ]);

      // Check that the answer contains the user message and assistant response
      expect(answer.length).toBeGreaterThan(0);
      const userMessage = answer.find(
        (m) =>
          m.role === 'user' &&
          m.parts[0]?.type === 'text' &&
          'text' in m.parts[0] &&
          m.parts[0].text === 'Hi agent',
      );
      expect(userMessage).toBeDefined();
      const assistantMessage = answer.find(
        (m) =>
          m.role === 'assistant' &&
          m.parts[0]?.type === 'text' &&
          'text' in m.parts[0] &&
          m.parts[0].text === 'Hello' &&
          'state' in m.parts[0] &&
          m.parts[0].state === 'done',
      );
      expect(assistantMessage).toBeDefined();
      expect(sideEffects.onTransitionCalls).toHaveLength(1);
      expect(sideEffects.onTransitionCalls[0]).toMatchObject({
        from: 'idle',
        to: 'responded',
        command: 'respond',
      });
      expect(sideEffects.onTerminalStateCalls).toHaveLength(1);
      expect(sideEffects.onTerminalStateCalls[0]).toMatchObject({
        phase: 'responded',
      });
    });

    it('streams responses from the agent', async () => {
      const factory = new AgentFactory({
        aiModelPort: new MockAIModel(),
      });

      // Use MockLanguageModelV2 from ai/test
      const mockModel = new MockLanguageModelV2({
        doStream: async () => ({
          stream: simulateReadableStream({
            chunks: [
              { type: 'text-start', id: 'text-1' },
              { type: 'text-delta', id: 'text-1', delta: 'Hello' },
              { type: 'text-end', id: 'text-1' },
              {
                type: 'finish',
                finishReason: 'stop',
                logprobs: undefined,
                usage: { inputTokens: 3, outputTokens: 5, totalTokens: 8 },
              },
            ],
          }),
        }),
      });

      const agent = factory.buildAgent({
        name: 'planner',
        system: 'You are a helpful assistant that can answer questions.',
        model: mockModel as never,
      });

      const chunks: UIMessage[][] = [];
      for await (const chunk of agent.runStream([
        {
          id: 'user-1',
          role: 'user',
          parts: [{ type: 'text', text: 'Hi agent' }],
        },
      ])) {
        chunks.push(chunk);
      }

      // The last chunk should contain the final message with "Hello"
      expect(chunks.length).toBeGreaterThan(0);
      const lastChunk = chunks[chunks.length - 1];
      expect(lastChunk).toBeDefined();
      const assistantMessage = lastChunk!.find((m) => m.role === 'assistant');
      expect(assistantMessage).toBeDefined();
      const textPart = assistantMessage!.parts[0];
      expect(textPart).toBeDefined();
      expect(textPart?.type).toBe('text');
      if (textPart?.type === 'text') {
        expect(textPart.text).toBe('Hello');
        expect(textPart.state).toBe('done');
      }
    });
  });
});
