import type { AttachedDatasourceSummary } from '@qwery/agent-factory-sdk';
import type { DatasourceMetadata } from '@qwery/domain';

export interface FixtureColumn {
  name: string;
  type: string;
}

/** A datasource summary as the agent sees it in its system prompt. */
export function datasourceSummary(
  name: string,
  table: string,
  columns: FixtureColumn[],
): AttachedDatasourceSummary {
  return {
    name,
    provider: 'memory',
    tables: [{ path: table, columns: columns.map((c) => ({ name: c.name, type: c.type })) }],
  };
}

/** Native-driver metadata returned by the `schema` tool, built from a column list. */
export function fixtureMetadata(table: string, columns: FixtureColumn[]): DatasourceMetadata {
  return {
    version: '0.0.1',
    driver: 'duckdb',
    schemas: [],
    tables: [],
    columns: columns.map((c, i) => ({
      id: String(i + 1),
      table_id: 1,
      schema: 'main',
      table,
      name: c.name,
      ordinal_position: i + 1,
      data_type: c.type,
      format: c.type,
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
  } as unknown as DatasourceMetadata;
}
