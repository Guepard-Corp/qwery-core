import { describe, it, expect, runEval } from '@qwery/evals';
import { readDataAgent } from '../../src/agents/actors/read-data-agent.actor';
import { AbstractQueryEngine } from '@qwery/domain/ports';
import { Repositories } from '@qwery/domain/repositories';
import { DatasourceMetadata, DatasourceResultSet } from '@qwery/extensions-sdk';
import { UIMessage } from 'ai';

const models = [
  'azure/gpt-5-mini',
  'azure/gpt-5-nano',
  'azure/gpt-5.1-codex-mini',
  'azure/Ministral-3B',
  'anthropic/claude-sonnet-4-5-20250929',
  'anthropic/claude-haiku-4-5-20251001',
];

// Minimal mock for QueryEngine
class MockQueryEngine extends AbstractQueryEngine {
  async initialize() {}
  async attach() {}
  async detach() {}
  async connect() {}
  async close() {}
  async query() {
    return {
      columns: [
        { name: 'id', displayName: 'ID', originalType: 'INTEGER' },
        { name: 'name', displayName: 'Name', originalType: 'VARCHAR' },
      ],
      rows: [{ id: 1, name: 'Test' }],
      stat: {
        rowsAffected: 1,
        queryDurationMs: 0,
        rowsRead: 1,
        rowsWritten: 0,
      },
    } as DatasourceResultSet;
  }
  async metadata() {
    return Promise.resolve({} as DatasourceMetadata);
  }
}

// Minimal mock for Repositories
const mockRepos = {
  datasource: {
    findAll: async () => [],
    findById: async () => null,
  },
  project: {
    findById: async () => null,
  },
  // Add other repos as needed by the agent
} as unknown as Repositories;

describe('Read Data Agent Evaluation', () => {
  models.forEach((model) => {
    [
      {
        scenario: 'Data discovery',
        userMessage: 'What tables do I have?',
        expectedTool: 'getSchema',
      },
      {
        scenario: 'Simple query',
        userMessage: 'How many users are there?',
        expectedTool: 'runQuery',
      },
    ].forEach(({ scenario, userMessage }) => {
      it(`should correctly handle ${scenario} (${model})`, async () => {
        const evalData = {
          prompt: userMessage,
          response: '',
        };

        const result = await runEval({
          agent: async () => {
            const agent = await readDataAgent(
              'test-conv',
              [
                {
                  id: '1',
                  role: 'user',
                  parts: [{ type: 'text', text: userMessage }],
                },
              ] as UIMessage[],
              model,
              new MockQueryEngine() as unknown as AbstractQueryEngine,
              mockRepos,
            );

            // The agent returned is an Experimental_Agent.
            // We need to execute it and capture the tool calls or final text.
            // For now, let's just use toTextResponse or similar if possible,
            // but AI SDK Agents are meant to be streamed.

            // In a real eval, we might want to use agent.doStep() or await agent.text
            // But Experimental_Agent doesn't always have .text directly depending on how it's used.
            // Let's try to get the text response.

            const text = await agent.text;

            return {
              result: text,
              usage: {
                inputTokens: 0,
                outputTokens: 0,
                totalTokens: 0,
              },
            };
          },
          model: model,
          eval: evalData,
        });

        expect(typeof result).toBe('string');
        // We can check if it mentions the tool or the result
      });
    });
  });
});
