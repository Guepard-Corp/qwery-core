import { describe, expect, test } from 'bun:test';
import type { Column, DatasourceMetadata } from '@qwery/domain';
import { createExpandSchemaTool } from '../expand-schema';
import type { DatasourceSchemaInfo } from '../schema';
import type { Track } from '../track';

const passThroughTrack: Track = async (_name, _input, fn) => (await fn()).llm;

function col(table: string, name: string, type = 'VARCHAR'): Column {
  return {
    id: `${table}.${name}`,
    table_id: 1,
    schema: 'main',
    table,
    name,
    ordinal_position: 1,
    data_type: type,
    format: type,
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
  };
}

const metadata: DatasourceMetadata = {
  version: '0',
  driver: 'test',
  schemas: [],
  tables: [],
  columns: [col('orders', 'id', 'BIGINT'), col('orders', 'total', 'DECIMAL'), col('customers', 'email')],
};

const provider = (infos: DatasourceSchemaInfo[]) => ({ listSchemas: async () => infos });

const opts = { toolCallId: 't', messages: [] };
// biome-ignore lint/suspicious/noExplicitAny: ai SDK tool.execute options typing is not under test
const run = (t: any, tables: string[]) => t.execute({ tables }, opts);

describe('createExpandSchemaTool', () => {
  test('is unavailable when no schema provider is wired', async () => {
    const tool = createExpandSchemaTool({ track: passThroughTrack });
    expect(await run(tool, ['orders'])).toEqual({ ok: true, available: false, datasources: [] });
  });

  test('reveals full columns for the named table (case-insensitive)', async () => {
    const tool = createExpandSchemaTool({
      track: passThroughTrack,
      schemaProvider: provider([{ datasourceId: '1', datasourceName: 'sales', metadata }]),
    });
    const res = (await run(tool, ['ORDERS'])) as {
      available: boolean;
      datasources: Array<{ datasource: string; tables: Array<{ table: string; columns: unknown[] }> }>;
      missing?: string[];
    };
    expect(res.available).toBe(true);
    expect(res.datasources[0]?.tables[0]).toEqual({
      table: 'orders',
      columns: [
        { column: 'id', type: 'BIGINT' },
        { column: 'total', type: 'DECIMAL' },
      ],
    });
    expect(res.missing).toBeUndefined();
  });

  test('reports unknown table names and skips datasources without metadata', async () => {
    const tool = createExpandSchemaTool({
      track: passThroughTrack,
      schemaProvider: provider([
        { datasourceId: '1', datasourceName: 'sales', metadata },
        { datasourceId: '2', datasourceName: 'broken', error: 'down' },
      ]),
    });
    const res = (await run(tool, ['customers', 'ghost'])) as {
      datasources: Array<{ tables: Array<{ table: string }> }>;
      missing?: string[];
    };
    expect(res.datasources[0]?.tables[0]?.table).toBe('customers');
    expect(res.missing).toEqual(['ghost']);
  });
});
