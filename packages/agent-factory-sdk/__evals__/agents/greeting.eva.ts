import { describe, it, expect, runEval } from '@qwery/evals';
import { greeting } from '../../src/agents/actors/greeting.actor';

const models = [
  'azure/gpt-5.2-chat',
  'azure/gpt-5-nano',
  //'azure/gpt-5.1-codex-mini',
  'azure/Ministral-3B',
  //'anthropic/claude-sonnet-4-5-20250929',
  'anthropic/claude-haiku-4-5-20251001',
];

describe('Greeting Agent Evaluation', () => {
  models.forEach((model) => {
    [
      {
        scenario: 'Simple greeting',
        userMessage: 'Hello',
      },
      {
        scenario: 'Informal greeting',
        userMessage: 'Hi there! How is it going?',
      },
      {
        scenario: 'Formal greeting',
        userMessage: 'Good morning',
      },
    ].forEach(({ scenario, userMessage }) => {
      it(`should provide a friendly greeting: ${scenario} (${model})`, async () => {
        const evalData = {
          prompt: userMessage,
          response: '', // We expect a greeting response
        };

        const result = await runEval({
          agent: async () => {
            const streamResult = await greeting(userMessage, model);
            const text = await streamResult.text;
            const usage = await streamResult.usage;

            // Safe extraction of token usage
            const u = usage as unknown as {
              promptTokens?: number;
              inputTokens?: number;
              completionTokens?: number;
              outputTokens?: number;
              totalTokens?: number;
            };
            const promptTokens = u?.promptTokens || u?.inputTokens || 0;
            const completionTokens =
              u?.completionTokens || u?.outputTokens || 0;
            const totalTokens =
              u?.totalTokens || promptTokens + completionTokens;

            return {
              result: text,
              usage: {
                inputTokens: promptTokens,
                outputTokens: completionTokens,
                totalTokens: totalTokens,
              },
            };
          },
          model: model,
          eval: evalData,
        });

        expect(typeof result).toBe('string');
        expect((result as string).length).toBeGreaterThan(5);
      });
    });
  });
});
