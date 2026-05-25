import { describe, expect, test } from 'bun:test';
import type { DatasourceMetadata } from '@qwery/domain';
import { createSchemaTool, type DatasourceSchemaInfo } from '../schema';
import type { Track } from '../track';

// Track stub: run the body and hand back the LLM payload (skip event emission).
const passThroughTrack: Track = async (_name, _input, fn) => (await fn()).llm;

function meta(table: string, cols: Array<[string, string]>): DatasourceMetadata {
  return {
    version: '0.0.1',
    driver: 'test',
    schemas: [],
    tables: [],
    columns: cols.map(([name, data_type], i) => ({
      id: `${table}.${name}`,
      table_id: 1,
      schema: 'main',
      table,
      name,
      ordinal_position: i + 1,
      data_type,
      format: data_type,
      is_identity: false,
      identity_generation: null,
      is_generated: false,
      is_nullable: true,
      is_updatable: true,
      is_unique: false,
      check: null,
      default_value: null,
      enums: [],
      comment: null,
    })),
  };
}

const provider = (infos: DatasourceSchemaInfo[]) => ({ listSchemas: async () => infos });
const opts = { toolCallId: 't', messages: [] };

// biome-ignore lint/suspicious/noExplicitAny: ai SDK tool.execute options typing is not under test
const run = (t: any, detailLevel: 'simple' | 'full') => t.execute({ detailLevel }, opts);

describe('createSchemaTool', () => {
  test('simple mode returns SimpleSchema per attached datasource', async () => {
    const tool = createSchemaTool({
      track: passThroughTrack,
      schemaProvider: provider([
        { datasourceId: '1', datasourceName: 'sales', metadata: meta('orders', [['id', 'BIGINT']]) },
      ]),
    });
    const res = await run(tool, 'simple');
    expect(res).toMatchObject({
      ok: true,
      detailLevel: 'simple',
      datasources: [
        {
          datasource: 'sales',
          schemas: [
            { schemaName: 'main', tables: [{ tableName: 'orders', columns: [{ columnName: 'id' }] }] },
          ],
        },
      ],
    });
  });

  test('full mode returns raw metadata', async () => {
    const m = meta('orders', [['id', 'BIGINT']]);
    const tool = createSchemaTool({
      track: passThroughTrack,
      schemaProvider: provider([{ datasourceId: '1', datasourceName: 'sales', metadata: m }]),
    });
    const res = (await run(tool, 'full')) as { detailLevel: string; datasources: unknown[] };
    expect(res.detailLevel).toBe('full');
    expect(res.datasources).toEqual([{ datasource: 'sales', metadata: m }]);
  });

  test('surfaces per-datasource errors but still returns the good ones', async () => {
    const tool = createSchemaTool({
      track: passThroughTrack,
      schemaProvider: provider([
        { datasourceId: '1', datasourceName: 'sales', metadata: meta('orders', [['id', 'BIGINT']]) },
        { datasourceId: '2', datasourceName: 'broken', error: 'connection refused' },
      ]),
    });
    const res = (await run(tool, 'simple')) as { errors?: Array<{ datasource: string; error: string }> };
    expect(res.errors).toEqual([{ datasource: 'broken', error: 'connection refused' }]);
  });

  test('throws when no datasource yields a schema', async () => {
    const tool = createSchemaTool({ track: passThroughTrack, schemaProvider: provider([]) });
    await expect(run(tool, 'simple')).rejects.toThrow(/Could not load schema/);
  });

  test('errors when no provider is configured', async () => {
    const tool = createSchemaTool({ track: passThroughTrack });
    await expect(run(tool, 'simple')).rejects.toThrow(/not available/);
  });
});
