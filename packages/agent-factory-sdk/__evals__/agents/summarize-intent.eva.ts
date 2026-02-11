import { describe, it, expect, runEval } from '@qwery/evals';
import { summarizeIntent } from '../../src/agents/actors/summarize-intent.actor';
import { Intent } from '../../src/agents/types';

const models = [
  'azure/gpt-5-mini',
  'azure/gpt-5-nano',
  //'azure/gpt-5.1-codex-mini',
  'azure/Ministral-3B',
  //'anthropic/claude-sonnet-4-5-20250929',
  'anthropic/claude-haiku-4-5-20251001',
];

describe('Summarize Intent Agent Evaluation', () => {
  models.forEach((model) => {
    [
      {
        scenario: 'Database creation (unsupported)',
        userMessage: 'Create a new postgres database for my project',
        intent: {
          intent: 'create-database',
          complexity: 'simple',
          needsChart: false,
          needsSQL: false,
        } as Intent,
        model: model,
      },
      {
        scenario: 'Datasource update (unsupported)',
        userMessage: 'Update the connection string of my database',
        intent: {
          intent: 'update-datasource',
          complexity: 'simple',
          needsChart: false,
          needsSQL: false,
        } as Intent,
        model: model,
      },
      {
        scenario: 'Other/Irrelevant (unsupported)',
        userMessage: 'Who won the world cup in 2022?',
        intent: {
          intent: 'other',
          complexity: 'simple',
          needsChart: false,
          needsSQL: false,
        } as Intent,
        model: model,
      },
    ].forEach(({ scenario, userMessage, intent, model }) => {
      it(`should provide a friendly summary for: ${scenario}`, async () => {
        const evalData = {
          prompt: userMessage,
          response: '', // We expect a non-empty string as a response
        };

        const result = await runEval({
          agent: async () => {
            const streamResult = await summarizeIntent(
              userMessage,
              intent,
              model,
            );
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
        const isLongEnough = (result as string).length > 10;
        expect(isLongEnough).toBe(true);
      });
    });
  });
});
