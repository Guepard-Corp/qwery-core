import { describe, expect, test } from 'bun:test';
import type { DatasourceMetadata, OBQCRule, OntologyProvider } from '@qwery/domain';
import type { DatasourceSchemaInfo } from '../schema';
import type { Track } from '../track';
import { createValidateQueryTool } from '../validate-query';

const passThroughTrack: Track = async (_name, _input, fn) => (await fn()).llm;

const emptyMeta: DatasourceMetadata = { version: '0', driver: 'test', schemas: [], tables: [], columns: [] };

const provider = (infos: DatasourceSchemaInfo[]) => ({ listSchemas: async () => infos });

const fakeOntology = (rules: OBQCRule[]): OntologyProvider => ({
  getConcepts: () => [],
  getConstraints: () => rules,
});

const orderRules: OBQCRule[] = [
  {
    ruleType: 'domain',
    subjectTable: 'orders',
    subjectColumn: 'total',
    propertyIri: 'ex:total',
    constraint: '',
    confidence: 1,
  },
];

const opts = { toolCallId: 't', messages: [] };
// biome-ignore lint/suspicious/noExplicitAny: ai SDK tool.execute options typing is not under test
const run = (t: any, sql: string) => t.execute({ sql }, opts);

describe('createValidateQueryTool', () => {
  test('is unavailable (and passes) when no ontology provider is wired', async () => {
    const tool = createValidateQueryTool({ track: passThroughTrack, schemaProvider: provider([]) });
    expect(await run(tool, 'SELECT o.x FROM orders o')).toEqual({ ok: true, available: false, valid: true });
  });

  test('is unavailable when no schema provider is wired', async () => {
    const tool = createValidateQueryTool({
      track: passThroughTrack,
      ontologyProvider: fakeOntology(orderRules),
    });
    expect(await run(tool, 'SELECT o.x FROM orders o')).toMatchObject({ available: false, valid: true });
  });

  test('passes a query that references only known columns', async () => {
    const tool = createValidateQueryTool({
      track: passThroughTrack,
      schemaProvider: provider([{ datasourceId: '1', datasourceName: 'sales', metadata: emptyMeta }]),
      ontologyProvider: fakeOntology(orderRules),
    });
    expect(await run(tool, 'SELECT orders.total FROM orders')).toEqual({
      ok: true,
      available: true,
      valid: true,
      violations: [],
    });
  });

  test('flags a hallucinated column and returns a repair prompt', async () => {
    const tool = createValidateQueryTool({
      track: passThroughTrack,
      schemaProvider: provider([
        { datasourceId: '1', datasourceName: 'sales', metadata: emptyMeta },
        { datasourceId: '2', datasourceName: 'broken', error: 'connection refused' },
      ]),
      ontologyProvider: fakeOntology(orderRules),
    });
    const res = (await run(tool, 'SELECT o.bad FROM orders o')) as {
      valid: boolean;
      violations: Array<{ entity: string }>;
      repairPrompt?: string;
    };
    expect(res.valid).toBe(false);
    expect(res.violations[0]?.entity).toBe('bad');
    expect(res.repairPrompt).toContain('bad');
  });
});
