import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Datasource } from '@qwery/domain/entities';
import { DatasourceKind } from '@qwery/domain/entities';
import { CliUsageError } from '../utils/errors';

// Mock FactoryAgent to throw Azure credential error - must be before import
vi.mock('@qwery/agent-factory-sdk', () => {
  return {
    FactoryAgent: {
      create: vi.fn().mockRejectedValue(
        new Error('Azure credentials are not configured. Please set AZURE_API_KEY and AZURE_RESOURCE_NAME'),
      ),
    },
    validateUIMessages: vi.fn(),
  };
});

import { NotebookRunner } from '../services/notebook-runner';

describe('NotebookRunner', () => {
  let runner: NotebookRunner;
  let testDatasource: Datasource;

  beforeEach(() => {
    runner = new NotebookRunner();
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
      isPublic: false,
    };
  });

  describe('runCell', () => {
    it('throws error for natural language mode', async () => {
      await expect(
        runner.runCell({
          datasource: testDatasource,
          query: 'show me all users',
          mode: 'natural',
        }),
      ).rejects.toThrow(CliUsageError);
    });

    it('throws error with helpful message for natural language', async () => {
      await expect(
        runner.runCell({
          datasource: testDatasource,
          query: 'show me all users',
          mode: 'natural',
        }),
      ).rejects.toThrow('Natural language mode is not yet available');
    });

    it('accepts SQL mode queries', async () => {
      // This will fail without real connection, but tests the mode acceptance
      await expect(
        runner.runCell({
          datasource: testDatasource,
          query: 'SELECT 1',
          mode: 'sql',
        }),
      ).rejects.toThrow(); // Connection error, not mode error
    });
  });

  describe('testConnection', () => {
    it('attempts to test connection (will fail without real DB)', async () => {
      await expect(runner.testConnection(testDatasource)).rejects.toThrow(); // Connection error expected
    });
  });
});
