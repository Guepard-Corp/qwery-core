import { describe, expect, test } from 'bun:test';
import type { DatasourceMetadata, OntologyProvider, RetrievedTable, SchemaRetriever } from '@qwery/domain';
import type { DatasourceSchemaInfo } from '../schema';
import { createSearchSchemaTool } from '../search-schema';
import type { Track } from '../track';

const passThroughTrack: Track = async (_name, _input, fn) => (await fn()).llm;
const emptyMeta: DatasourceMetadata = { version: '0', driver: 'test', schemas: [], tables: [], columns: [] };
const provider = (infos: DatasourceSchemaInfo[]) => ({ listSchemas: async () => infos });

const cannedTables: RetrievedTable[] = [
  {
    schema: 'main',
    table: 'sales',
    maxScore: 1,
    columns: [
      { schema: 'main', table: 'sales', column: 'revenue', dataType: 'DECIMAL', score: 1, directMatch: true },
      {
        schema: 'main',
        table: 'sales',
        column: 'region',
        dataType: 'VARCHAR',
        score: 0.2,
        directMatch: false,
      },
    ],
  },
];
const fakeRetriever: SchemaRetriever = { retrieve: async () => cannedTables };
const fakeOntology: OntologyProvider = {
  getConcepts: () => [
    { businessTerm: 'revenue', schemaEntity: 'main.sales.revenue', description: 'gross', confidence: 1 },
  ],
  getConstraints: () => [],
};

const opts = { toolCallId: 't', messages: [] };
// biome-ignore lint/suspicious/noExplicitAny: ai SDK tool.execute options typing is not under test
const run = (t: any, input: { query: string; topK?: number }) => t.execute(input, opts);

describe('createSearchSchemaTool', () => {
  test('is unavailable when no retriever is wired', async () => {
    const tool = createSearchSchemaTool({ track: passThroughTrack, schemaProvider: provider([]) });
    expect(await run(tool, { query: 'revenue' })).toEqual({ ok: true, available: false, datasources: [] });
  });

  test('is unavailable when no schema provider is wired', async () => {
    const tool = createSearchSchemaTool({ track: passThroughTrack, schemaRetriever: fakeRetriever });
    expect(await run(tool, { query: 'revenue' })).toMatchObject({ available: false, datasources: [] });
  });

  test('returns relevant tables plus ontology concepts, skipping failed datasources', async () => {
    const tool = createSearchSchemaTool({
      track: passThroughTrack,
      schemaProvider: provider([
        { datasourceId: '1', datasourceName: 'sales', metadata: emptyMeta },
        { datasourceId: '2', datasourceName: 'broken', error: 'down' },
      ]),
      schemaRetriever: fakeRetriever,
      ontologyProvider: fakeOntology,
    });
    const res = (await run(tool, { query: 'revenue', topK: 5 })) as {
      available: boolean;
      datasources: Array<{
        datasource: string;
        tables: Array<{ table: string; columns: Array<{ column: string; relevant: boolean }> }>;
        concepts?: Array<{ businessTerm: string }>;
      }>;
    };
    expect(res.available).toBe(true);
    expect(res.datasources).toHaveLength(1);
    expect(res.datasources[0]?.tables[0]?.columns).toEqual([
      { column: 'revenue', type: 'DECIMAL', relevant: true },
      { column: 'region', type: 'VARCHAR', relevant: false },
    ]);
    expect(res.datasources[0]?.concepts?.[0]?.businessTerm).toBe('revenue');
  });

  test('omits concepts when no ontology provider is wired', async () => {
    const tool = createSearchSchemaTool({
      track: passThroughTrack,
      schemaProvider: provider([{ datasourceId: '1', datasourceName: 'sales', metadata: emptyMeta }]),
      schemaRetriever: fakeRetriever,
    });
    const res = (await run(tool, { query: 'revenue' })) as {
      datasources: Array<Record<string, unknown>>;
    };
    expect('concepts' in res.datasources[0]).toBe(false);
  });
});
