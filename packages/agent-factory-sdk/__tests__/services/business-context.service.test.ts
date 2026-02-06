import { describe, it, expect, beforeEach } from 'vitest';
import { loadBusinessContext } from '../../src/tools/utils/business-context.storage';
import { buildBusinessContext } from '../../src/tools/build-business-context';
import type { SimpleSchema } from '@qwery/domain/entities';
import { join } from 'node:path';
import { mkdir, rm } from 'node:fs/promises';

describe('BusinessContextService', () => {
  const testDir = join(process.cwd(), 'test-business-context');

  beforeEach(async () => {
    // Clean up test directory
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore if doesn't exist
    }
    await mkdir(testDir, { recursive: true });
  });

  it('should create business context from a single schema', async () => {
    const schema: SimpleSchema = {
      databaseName: 'test',
      schemaName: 'test',
      tables: [
        {
          tableName: 'users',
          columns: [
            { columnName: 'id', columnType: 'BIGINT' },
            { columnName: 'name', columnType: 'VARCHAR' },
            { columnName: 'email', columnType: 'VARCHAR' },
          ],
        },
      ],
    };

    const context = await buildBusinessContext({
      conversationDir: testDir,
      viewName: 'users',
      schema,
    });

    expect(context).toBeDefined();
    expect(context.entities.size).toBeGreaterThan(0);
    expect(context.vocabulary.size).toBeGreaterThan(0);
    expect(context.domain.domain).toBe('general');
    expect(context.views.has('users')).toBe(true);
  });

  it('should build fast context for multiple views (relationships detected in enhanced path)', async () => {
    // First view
    const schema1: SimpleSchema = {
      databaseName: 'test',
      schemaName: 'test',
      tables: [
        {
          tableName: 'users',
          columns: [
            { columnName: 'id', columnType: 'BIGINT' },
            { columnName: 'name', columnType: 'VARCHAR' },
          ],
        },
      ],
    };

    const context1 = await buildBusinessContext({
      conversationDir: testDir,
      viewName: 'users',
      schema: schema1,
    });

    // Second view with common column
    const schema2: SimpleSchema = {
      databaseName: 'test',
      schemaName: 'test',
      tables: [
        {
          tableName: 'orders',
          columns: [
            { columnName: 'id', columnType: 'BIGINT' },
            { columnName: 'user_id', columnType: 'BIGINT' },
            { columnName: 'total', columnType: 'DOUBLE' },
          ],
        },
      ],
    };

    const context2 = await buildBusinessContext({
      conversationDir: testDir,
      viewName: 'orders',
      schema: schema2,
    });

    // Fast path doesn't detect relationships (that's done in enhanced path)
    expect(context1.relationships.length).toBe(0);
    expect(context2.relationships.length).toBe(0);
    // But should have entities
    expect(context1.entities.size).toBeGreaterThan(0);
    expect(context2.entities.size).toBeGreaterThan(0);
  });

  it('should persist and load business context', async () => {
    const schema: SimpleSchema = {
      databaseName: 'test',
      schemaName: 'test',
      tables: [
        {
          tableName: 'products',
          columns: [
            { columnName: 'id', columnType: 'BIGINT' },
            { columnName: 'name', columnType: 'VARCHAR' },
          ],
        },
      ],
    };

    await buildBusinessContext({
      conversationDir: testDir,
      viewName: 'products',
      schema,
    });

    let loaded: Awaited<ReturnType<typeof loadBusinessContext>> = null;
    for (let i = 0; i < 25; i++) {
      await new Promise((r) => setTimeout(r, 50));
      loaded = await loadBusinessContext(testDir);
      if (loaded?.views.has('products')) break;
    }

    expect(loaded).toBeDefined();
    expect(loaded?.views.has('products')).toBe(true);
    expect(loaded?.entities.size).toBeGreaterThan(0);
  });
});
