import { describe, it, expect, runEval } from '@qwery/evals';
import { validateUIMessages, convertToModelMessages } from 'ai';
import { Provider } from '../../src/llm/provider';
import { Registry } from '../../src/tools/registry';
import { LLM } from '../../src/llm/llm';

const models = [
  'azure/gpt-5.2-chat',
  'azure/gpt-5-nano',
  // 'azure/gpt-5.1-codex-mini',
  //'azure/Ministral-3B',
  // 'anthropic/claude-sonnet-4-5-20250929',
  'anthropic/claude-haiku-4-5-20251001',
];

/**
 * Runs one turn of the ask agent (same model, tools, and system prompt as the
 * session with agentId 'ask'). Does not use the full session loop or repos;
 * for session e2e see __tests__/agents/agent-session.test.ts.
 */
async function runAskAgentTurn(
  userMessage: string,
  model: string,
): Promise<{
  text: string;
  usage: { inputTokens: number; outputTokens: number; totalTokens: number };
}> {
  const abortController = new AbortController();
  const providerModel =
    typeof model === 'string'
      ? Provider.getModelFromString(model)
      : Provider.getDefaultModel();
  const modelForRegistry = {
    providerId: providerModel.providerID,
    modelId: providerModel.id,
  };
  const getContext = (options: {
    toolCallId?: string;
    abortSignal?: AbortSignal;
  }) => ({
    conversationId: 'eval-ask',
    agentId: 'ask',
    messageId: 'eval-msg',
    callId: options.toolCallId,
    abort: options.abortSignal ?? abortController.signal,
    extra: {},
    messages: [],
    ask: async () => {},
    metadata: async () => {},
  });
  const { tools } = await Registry.tools.forAgent(
    'ask',
    modelForRegistry,
    getContext,
  );
  const messages = [
    {
      id: 'user-msg-1',
      role: 'user' as const,
      parts: [{ type: 'text' as const, text: userMessage }],
    },
  ];
  const validated = await validateUIMessages({ messages });
  const messagesForLlm = await convertToModelMessages(validated, { tools });
  const result = await LLM.stream({
    model,
    messages: messagesForLlm,
    tools,
    abortSignal: abortController.signal,
  });
  const text = await result.text;
  const rawUsage = await result.usage;
  const u = rawUsage as unknown as {
    promptTokens?: number;
    inputTokens?: number;
    completionTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
  const inputTokens = u?.promptTokens ?? u?.inputTokens ?? 0;
  const outputTokens = u?.completionTokens ?? u?.outputTokens ?? 0;
  const totalTokens = u?.totalTokens ?? inputTokens + outputTokens;
  return {
    text,
    usage: {
      inputTokens,
      outputTokens,
      totalTokens,
    },
  };
}

describe('Ask Agent Evaluation', () => {
  models.forEach((model) => {
    [
      {
        scenario: 'Simple question',
        userMessage: 'What is 2 + 2?',
      },
    ].forEach(({ scenario, userMessage }) => {
      it(`should respond to ${scenario} (${model})`, async () => {
        const evalData = {
          prompt: userMessage,
          response: '',
        };

        const result = await runEval({
          agent: async () => {
            const { text, usage } = await runAskAgentTurn(userMessage, model);
            return { result: text, usage };
          },
          model,
          eval: evalData,
        });

        expect(typeof result).toBe('string');
        expect((result as string).length).toBeGreaterThanOrEqual(1);
      });
    });
  });
});
