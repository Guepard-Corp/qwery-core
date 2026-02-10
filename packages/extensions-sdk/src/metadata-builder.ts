import type { DatasourceMetadata } from './metadata';
import { DatasourceMetadataZodSchema } from './metadata';

export interface InformationSchemaRow {
  table_schema: string;
  table_name: string;
  column_name: string;
  data_type: string;
  ordinal_position: number;
  is_nullable: string;
}

export interface PrimaryKeyRow {
  table_schema: string;
  table_name: string;
  column_name: string;
}

export interface ForeignKeyRow {
  constraint_name: string;
  source_schema: string;
  source_table_name: string;
  source_column_name: string;
  target_table_schema: string;
  target_table_name: string;
  target_column_name: string;
}

export interface BuildMetadataOptions {
  driver: string;
  rows: InformationSchemaRow[];
  primaryKeys?: PrimaryKeyRow[];
  foreignKeys?: ForeignKeyRow[];
}

/**
 * Builds DatasourceMetadata from information_schema-style column rows.
 *
 * Shared utility for SQL-based drivers (PostgreSQL, MySQL, DuckDB, PGlite, etc.)
 * to avoid duplicating the tableMap / column assembly logic.
 */
export function buildMetadataFromInformationSchema(
  options: BuildMetadataOptions,
): DatasourceMetadata {
  const { driver, rows, primaryKeys = [], foreignKeys = [] } = options;

  let tableId = 1;
  const tableMap = new Map<
    string,
    {
      id: number;
      schema: string;
      name: string;
      columns: Array<{
        id: string;
        table_id: number;
        schema: string;
        table: string;
        name: string;
        ordinal_position: number;
        data_type: string;
        format: string;
        is_identity: boolean;
        identity_generation: null;
        is_generated: boolean;
        is_nullable: boolean;
        is_updatable: boolean;
        is_unique: boolean;
        check: null;
        default_value: null;
        enums: [];
        comment: null;
      }>;
    }
  >();

  for (const row of rows) {
    const key = `${row.table_schema}.${row.table_name}`;
    if (!tableMap.has(key)) {
      tableMap.set(key, {
        id: tableId++,
        schema: row.table_schema,
        name: row.table_name,
        columns: [],
      });
    }
    const entry = tableMap.get(key)!;
    entry.columns.push({
      id: `${row.table_schema}.${row.table_name}.${row.column_name}`,
      table_id: 0,
      schema: row.table_schema,
      table: row.table_name,
      name: row.column_name,
      ordinal_position: row.ordinal_position,
      data_type: row.data_type,
      format: row.data_type,
      is_identity: false,
      identity_generation: null,
      is_generated: false,
      is_nullable: row.is_nullable === 'YES',
      is_updatable: true,
      is_unique: false,
      check: null,
      default_value: null,
      enums: [],
      comment: null,
    });
  }

  let relationshipId = 1;

  const tables = Array.from(tableMap.values()).map((table) => {
    const tablePrimaryKeys = primaryKeys
      .filter(
        (pk) =>
          pk.table_schema === table.schema && pk.table_name === table.name,
      )
      .map((pk) => ({
        table_id: table.id,
        name: pk.column_name,
        schema: table.schema,
        table_name: table.name,
      }));

    const relationships = foreignKeys
      .filter(
        (fk) =>
          fk.source_schema === table.schema &&
          fk.source_table_name === table.name,
      )
      .map((fk) => ({
        id: relationshipId++,
        constraint_name: fk.constraint_name,
        source_schema: fk.source_schema,
        source_table_name: fk.source_table_name,
        source_column_name: fk.source_column_name,
        target_table_schema: fk.target_table_schema,
        target_table_name: fk.target_table_name,
        target_column_name: fk.target_column_name,
      }));

    return {
      id: table.id,
      schema: table.schema,
      name: table.name,
      rls_enabled: false,
      rls_forced: false,
      bytes: 0,
      size: '0',
      live_rows_estimate: 0,
      dead_rows_estimate: 0,
      comment: null,
      primary_keys: tablePrimaryKeys,
      relationships,
    };
  });

  const columns = Array.from(tableMap.values()).flatMap((table) =>
    table.columns.map((column) => ({
      ...column,
      table_id: table.id,
    })),
  );

  const schemas = Array.from(
    new Set(Array.from(tableMap.values()).map((table) => table.schema)),
  ).map((name, idx) => ({
    id: idx + 1,
    name,
    owner: 'unknown',
  }));

  return DatasourceMetadataZodSchema.parse({
    version: '0.0.1',
    driver,
    schemas,
    tables,
    columns,
  });
}
