import { describe, it, expect, runEval } from '@qwery/evals';
import { systemInfo } from '../../src/agents/actors/system-info.actor';

const models = [
  'azure/gpt-5.2-chat',
  'azure/gpt-5-nano',
  //'azure/gpt-5.1-codex-mini',
  'azure/Ministral-3B',
  //'anthropic/claude-sonnet-4-5-20250929',
  'anthropic/claude-haiku-4-5-20251001',
];

describe('System Info Agent Evaluation', () => {
  models.forEach((model) => {
    [
      {
        scenario: 'Identity check',
        userMessage: 'Who are you?',
        mustMention: ['Qwery'],
      },
      {
        scenario: 'Platform description',
        userMessage: 'What is Qwery?',
        mustMention: ['Qwery', 'platform', 'data'],
      },
      {
        scenario: 'System version',
        userMessage: 'What version of Qwery is this?',
        mustMention: ['version', '1.1.0'],
      },
    ].forEach(({ scenario, userMessage, mustMention }) => {
      it(`should correctly handle ${scenario} (${model})`, async () => {
        const evalData = {
          prompt: userMessage,
          response: '', // We expect a descriptive response
        };

        const result = await runEval({
          agent: async () => {
            const streamResult = await systemInfo(userMessage);
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
        const textResult = result as string;
        expect(textResult.length).toBeGreaterThan(10);

        mustMention.forEach((term) => {
          expect(textResult.toLowerCase()).toContain(term.toLowerCase());
        });
      });
    });
  });
});
