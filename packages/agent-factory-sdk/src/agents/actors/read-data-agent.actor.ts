import { z } from 'zod';
import {
  Experimental_Agent as Agent,
  convertToModelMessages,
  UIMessage,
  tool,
  validateUIMessages,
  stepCountIs,
} from 'ai';
import { fromPromise } from 'xstate/actors';
import { resolveModel } from '../../services';
import { testConnection } from '../../tools/test-connection';
import { gsheetToDuckdb } from '../../tools/gsheet-to-duckdb';
import { extractSchema } from '../../tools/extract-schema';
import { runQuery } from '../../tools/run-query';
import { READ_DATA_AGENT_PROMPT } from '../prompts/read-data-agent.prompt';

// Support both import.meta.env (Vite/browser) and process.env (Node.js)
const WORKSPACE = resolveWorkspaceDir();

function resolveWorkspaceDir(): string | undefined {
  const globalProcess =
    typeof globalThis !== 'undefined'
      ? (globalThis as { process?: NodeJS.Process }).process
      : undefined;
  const envValue =
    globalProcess?.env?.WORKSPACE ??
    globalProcess?.env?.VITE_WORKING_DIR ??
    globalProcess?.env?.WORKING_DIR;
  if (envValue) {
    return envValue;
  }

  try {
    return (import.meta as { env?: Record<string, string> })?.env
      ?.VITE_WORKING_DIR;
  } catch {
    return undefined;
  }
}

export const readDataAgent = async (
  conversationId: string,
  messages: UIMessage[],
) => {
  const result = new Agent({
    model: await resolveModel('azure/gpt-5-mini'),
    system: READ_DATA_AGENT_PROMPT,
    tools: {
      testConnection: tool({
        description:
          'Test the connection to the database to check if the database is accessible',
        inputSchema: z.object({}),
        execute: async () => {
          if (!WORKSPACE) {
            throw new Error('WORKSPACE environment variable is not set');
          }
          const { join } = await import('node:path');
          const dbPath = join(WORKSPACE, conversationId, 'database.db');
          const result = await testConnection({
            dbPath: dbPath,
          });
          return result.toString();
        },
      }),
      createDbViewFromSheet: tool({
        description: 'Create a View from a Google Sheet',
        inputSchema: z.object({
          sharedLink: z.string(),
        }),
        execute: async ({ sharedLink }) => {
          if (!WORKSPACE) {
            throw new Error('WORKSPACE environment variable is not set');
          }
          const { join } = await import('node:path');
          const { mkdir } = await import('node:fs/promises');
          await mkdir(WORKSPACE, { recursive: true });
          const fileDir = join(WORKSPACE, conversationId);
          await mkdir(fileDir, { recursive: true });
          const dbPath = join(fileDir, 'database.db');

          console.debug(
            `[ReadDataAgent:${conversationId}] Creating DuckDB view from sheet: ${sharedLink}`,
          );
          const message = await gsheetToDuckdb({
            dbPath,
            sharedLink,
          });
          return {
            content: message,
          };
        },
      }),
      getSchema: tool({
        description: 'Get the schema of the Google Sheet view',
        inputSchema: z.object({}),
        execute: async () => {
          if (!WORKSPACE) {
            throw new Error('WORKSPACE environment variable is not set');
          }
          const { join } = await import('node:path');
          const dbPath = join(WORKSPACE, conversationId, 'database.db');

          const schema = await extractSchema({ dbPath });
          return {
            schema: schema,
          };
        },
      }),
      runQuery: tool({
        description: 'Run a SQL query against the Google Sheet view',
        inputSchema: z.object({
          query: z.string(),
        }),
        execute: async ({ query }) => {
          if (!WORKSPACE) {
            throw new Error('WORKSPACE environment variable is not set');
          }
          const { join } = await import('node:path');
          const dbPath = join(WORKSPACE, conversationId, 'database.db');

          const result = await runQuery({
            dbPath,
            query,
          });
          return {
            result: result,
          };
        },
      }),
    },
    stopWhen: stepCountIs(20),
  });

  return result.stream({
    messages: convertToModelMessages(await validateUIMessages({ messages })),
  });
};

export const readDataAgentActor = fromPromise(
  async ({
    input,
  }: {
    input: {
      conversationId: string;
      previousMessages: UIMessage[];
    };
  }) => {
    return readDataAgent(input.conversationId, input.previousMessages);
  },
);
