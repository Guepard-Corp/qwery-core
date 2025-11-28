import type { Datasource } from '@qwery/domain/entities';
import {
  FactoryAgent,
  validateUIMessages,
  type UIMessage,
} from '@qwery/agent-factory-sdk';
import { createDriverForDatasource } from '../extensions/driver-factory';
import { CliUsageError } from '../utils/errors';
import { nanoid } from 'nanoid';

export interface RunCellOptions {
  datasource: Datasource;
  query: string;
  mode: 'sql' | 'natural';
}

export interface RunCellResult {
  sql: string;
  rows: Array<Record<string, unknown>>;
  rowCount: number;
}

// Map to persist agent instances by datasource ID
const agents = new Map<string, FactoryAgent>();

export class NotebookRunner {
  public async testConnection(datasource: Datasource): Promise<void> {
    const driver = await createDriverForDatasource(datasource);
    try {
      await driver.testConnection();
    } finally {
      driver.close();
    }
  }

  public async runCell(options: RunCellOptions): Promise<RunCellResult> {
    // If SQL mode, execute directly
    if (options.mode === 'sql') {
      const driver = await createDriverForDatasource(options.datasource);
      try {
        const result = await driver.query(options.query);
        const rowCount =
          result.stat.rowsRead ??
          result.stat.rowsAffected ??
          result.rows.length;
        return { sql: options.query, rows: result.rows, rowCount };
      } finally {
        driver.close();
      }
    }

    // For natural language mode, use FactoryAgent
    try {
      // Get or create agent for this datasource
      let agent = agents.get(options.datasource.id);
      if (!agent) {
        const conversationId = `cli-${options.datasource.id}-${nanoid()}`;
        agent = new FactoryAgent({ conversationId });
        agents.set(options.datasource.id, agent);
      }

      // Prepare the query message
      // For datasource queries, we need to provide context about the datasource
      const datasourceContext = `Query the datasource "${options.datasource.name}" (${options.datasource.datasource_provider}). `;
      const fullQuery = datasourceContext + options.query;

      const messages: UIMessage[] = [
        {
          id: nanoid(),
          role: 'user',
          parts: [{ type: 'text', text: fullQuery }],
        },
      ];

      // Get response from FactoryAgent
      const response = await agent.respond({
        messages: await validateUIMessages({ messages }),
      });

      if (!response.body) {
        throw new CliUsageError('Agent returned no response');
      }

      // Stream the response and extract SQL/result
      // For now, we'll need to parse the stream to extract SQL
      // The FactoryAgent handles Google Sheets and other data sources internally
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          const chunk = decoder.decode(value, { stream: true });
          fullResponse += chunk;
        }
      } finally {
        reader.releaseLock();
      }

      // The FactoryAgent may return results directly or SQL
      // For Google Sheets, it returns the data
      // For regular datasources, we might need to extract SQL and execute it
      // For now, if the response contains SQL-like text, try to extract and execute it
      // Otherwise, return the response as-is

      // Try to extract SQL from the response
      const sqlMatch = fullResponse.match(/SELECT[\s\S]*?(?=\n\n|\n$|$)/i);
      if (sqlMatch) {
        const sql = sqlMatch[0].trim();
        const driver = await createDriverForDatasource(options.datasource);
        try {
          const result = await driver.query(sql);
          const rowCount =
            result.stat.rowsRead ??
            result.stat.rowsAffected ??
            result.rows.length;
          return { sql, rows: result.rows, rowCount };
        } finally {
          driver.close();
        }
      }

      // If no SQL found, the agent may have returned data directly (e.g., Google Sheets)
      // Return a formatted result
      return {
        sql: options.query,
        rows: [{ response: fullResponse }],
        rowCount: 1,
      };
    } catch (error) {
      // Catch Azure credential errors and other agent initialization errors
      if (
        error instanceof Error &&
        (error.message.includes('Azure credentials') ||
          error.message.includes('AZURE_API_KEY') ||
          error.message.includes('AZURE_RESOURCE_NAME'))
      ) {
        throw new CliUsageError('Natural language mode is not yet available');
      }
      // Re-throw other errors
      throw error;
    }
  }
}
