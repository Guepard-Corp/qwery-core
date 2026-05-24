import type { DatasourceMetadata } from './metadata.type';
import type { SimpleColumn, SimpleSchema, SimpleTable } from './simple-schema.type';

/**
 * Collapses the rich `DatasourceMetadata` (schemas/tables/columns/types/PK/FK)
 * into the token-efficient `SimpleSchema[]` the agent's `schema` tool returns in
 * "simple" mode: one entry per schema, each listing its tables and their columns
 * (name + type only). Columns keep their `ordinal_position` order; schemas and
 * tables are sorted by name for stable, diffable output.
 */
export function toSimpleSchema(metadata: DatasourceMetadata, databaseName: string): SimpleSchema[] {
  // schema -> (table -> ordered columns)
  const bySchema = new Map<string, Map<string, SimpleColumn[]>>();

  const orderedColumns = [...metadata.columns].sort((a, b) => a.ordinal_position - b.ordinal_position);

  for (const column of orderedColumns) {
    let tables = bySchema.get(column.schema);
    if (!tables) {
      tables = new Map();
      bySchema.set(column.schema, tables);
    }
    let cols = tables.get(column.table);
    if (!cols) {
      cols = [];
      tables.set(column.table, cols);
    }
    cols.push({ columnName: column.name, columnType: column.data_type });
  }

  return Array.from(bySchema.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([schemaName, tableMap]): SimpleSchema => {
      const tables: SimpleTable[] = Array.from(tableMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([tableName, columns]) => ({ tableName, columns }));
      return { databaseName, schemaName, tables };
    });
}
