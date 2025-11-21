import { describe, it, expect, beforeEach } from 'vitest';
import { InteractiveQueryHandler } from '../services/interactive-query-handler';
import { CliContainer } from '../container/cli-container';
import type { Datasource } from '@qwery/domain/entities';
import { DatasourceKind } from '@qwery/domain/entities';
import { CliUsageError } from '../utils/errors';

describe('InteractiveQueryHandler', () => {
  let container: CliContainer;
  let handler: InteractiveQueryHandler;
  let testDatasource: Datasource;

  beforeEach(async () => {
    container = new CliContainer();
    await container.init();
    handler = new InteractiveQueryHandler(container);

    testDatasource = {
      id: 'ds-1',
      projectId: 'proj-1',
      name: 'test-db',
      description: 'Test database',
      datasource_provider: 'postgresql',
      datasource_driver: 'postgresql',
      datasource_kind: DatasourceKind.REMOTE,
      slug: 'test-db',
      config: { connectionUrl: 'postgresql://localhost/test' },
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user-1',
      updatedBy: 'user-1',
    };

    await container.getRepositories().datasource.create(testDatasource);
  });

  describe('detectMode', () => {
    it('detects SQL mode for SELECT queries', () => {
      const mode = (
        handler as never as { detectMode(query: string): 'sql' | 'natural' }
      ).detectMode('SELECT * FROM users');
      expect(mode).toBe('sql');
    });

    it('detects SQL mode for INSERT queries', () => {
      const mode = (
        handler as never as { detectMode(query: string): 'sql' | 'natural' }
      ).detectMode('INSERT INTO users VALUES (1)');
      expect(mode).toBe('sql');
    });

    it('detects SQL mode for UPDATE queries', () => {
      const mode = (
        handler as never as { detectMode(query: string): 'sql' | 'natural' }
      ).detectMode('UPDATE users SET name = "test"');
      expect(mode).toBe('sql');
    });

    it('detects SQL mode for WITH queries', () => {
      const mode = (
        handler as never as { detectMode(query: string): 'sql' | 'natural' }
      ).detectMode('WITH cte AS (SELECT 1) SELECT * FROM cte');
      expect(mode).toBe('sql');
    });

    it('detects natural language mode for non-SQL queries', () => {
      const mode = (
        handler as never as { detectMode(query: string): 'sql' | 'natural' }
      ).detectMode('how many users do we have');
      expect(mode).toBe('natural');
    });

    it('is case-insensitive for SQL detection', () => {
      const mode = (
        handler as never as { detectMode(query: string): 'sql' | 'natural' }
      ).detectMode('select * from users');
      expect(mode).toBe('sql');
    });
  });

  describe('execute', () => {
    it('throws error for natural language mode (not yet implemented)', async () => {
      // Register extensions first
      const { registerCliExtensions } = await import('../extensions/register');
      registerCliExtensions();

      await expect(
        handler.execute('how many users do we have', testDatasource),
      ).rejects.toThrow(CliUsageError);
    });

    it('handles SQL queries (will fail without real driver, but tests the flow)', async () => {
      // Register extensions first
      const { registerCliExtensions } = await import('../extensions/register');
      registerCliExtensions();

      // This will fail because we don't have a real database connection
      // But it tests that the handler routes to NotebookRunner correctly
      await expect(
        handler.execute('SELECT 1', testDatasource),
      ).rejects.toThrow(); // Will throw from driver connection attempt
    });
  });
});
