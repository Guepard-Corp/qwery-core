import { describe, it, expect, runEval, type ObjectEval } from '@qwery/evals';
import { detectIntent } from '../../src/agents/actors/detect-intent.actor';
import { Intent } from '../../src/agents/types';

const models = [
  'azure/gpt-5-mini',
  'azure/gpt-5-nano',
  //'azure/gpt-5.1-codex-mini',
  'azure/Ministral-3B',
  //'anthropic/claude-sonnet-4-5-20250929',
  'anthropic/claude-haiku-4-5-20251001',
];

describe('Intent Agent Evaluation without previous messages', () => {
  models.forEach((model) => {
    [
      {
        intent: 'greeting',
        userMessage: 'Hello',
        expectedIntent: 'greeting',
        model: model,
      },
      {
        intent: 'goodbye',
        userMessage: 'Thanks, bye bye',
        expectedIntent: 'goodbye',
        model: model,
      },
      {
        intent: 'other',
        userMessage: 'What is the weather like today?',
        expectedIntent: 'other',
        model: model,
      },
      {
        intent: 'read-data',
        userMessage:
          'Combien de clients ont acheté des produits de plus de 1000$',
        expectedIntent: 'read-data',
        model: model,
      },
      {
        intent: 'read-data',
        userMessage:
          "extrait tous les messages echangés qui concernant des lectures de données et qui ont été mal interpreté par l'agent",
        expectedIntent: 'read-data',
        needsSQL: true,
        complexity: 'complex',
        model: model,
      },
    ].forEach(
      ({
        intent,
        userMessage,
        expectedIntent,
        needsSQL,
        complexity,
        model,
      }) => {
        it(`should correctly detect the ${intent} intent without previous messages`, async () => {
          const evalData = {
            prompt: userMessage,
            response: {
              intent: expectedIntent,
              complexity: complexity || 'simple',
              needsChart: false,
              needsSQL: needsSQL || false,
            } as Intent,
          } as ObjectEval<Intent>;

          const result = await runEval({
            agent: async () => {
              const streamResult = await detectIntent(userMessage, [], model);
              const text = streamResult.result;
              const usage = streamResult.usage;

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

          expect(result.intent).toBe(expectedIntent);
        });
      },
    );
  });
});

describe('Intent Agent Evaluation with previous messages', () => {
  models.forEach((model) => {
    [
      {
        intent: 'read-data',
        previousMessages: [
          {
            id: 'msg-1',
            role: 'user' as const,
            content:
              'Combien de clients ont acheté des produits de plus de 1000$',
            parts: [
              {
                type: 'text' as const,
                text: 'Combien de clients ont acheté des produits de plus de 1000$',
              },
            ],
          },
        ],
        userMessage: 'Hello, how are you?',
        expectedIntent: 'read-data',
        model: model,
      },
    ].forEach(
      ({ intent, userMessage, previousMessages, expectedIntent, model }) => {
        it(`should correctly detect the ${intent} intent with previous messages`, async () => {
          const evalData = {
            prompt: userMessage,
            response: {
              intent: expectedIntent,
              complexity: 'simple',
              needsChart: false,
              needsSQL: false,
            } as Intent,
          } as ObjectEval<Intent>;

          const result = await runEval({
            agent: async () => {
              const streamResult = await detectIntent(
                userMessage,
                previousMessages,
                model,
              );
              const text = streamResult.result;
              const usage = streamResult.usage;

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

          expect(result.intent).toBe(expectedIntent);
        });
      },
    );
  });
});
