import type { SimpleSchema, SimpleTable } from '../../entities';
import type {
  TransformMetadataToSimpleSchemaInput,
  TransformMetadataToSimpleSchemaUseCase,
} from '../../usecases';

/**
 * System schemas to filter out (PostgreSQL specific)
 */
const SYSTEM_SCHEMAS = new Set([
  'pg_catalog',
  'information_schema',
  'pg_toast',
  'pg_temp',
]);

/**
 * System table prefixes to filter out
 */
const SYSTEM_TABLE_PREFIXES = ['pg_', '_pg_'];

function isSystemSchema(schemaName: string): boolean {
  return SYSTEM_SCHEMAS.has(schemaName);
}

function isSystemTable(tableName: string): boolean {
  return SYSTEM_TABLE_PREFIXES.some((prefix) =>
    tableName.toLowerCase().startsWith(prefix),
  );
}

/**
 * Service to transform DatasourceMetadata to SimpleSchema format.
 * Groups tables by schema and formats table names for attached databases.
 * Filters out system schemas and tables automatically.
 */
export class TransformMetadataToSimpleSchemaService
  implements TransformMetadataToSimpleSchemaUseCase
{
  /**
   * Transform DatasourceMetadata to a map of SimpleSchema objects.
   * The map key is in the format "databaseName.schemaName".
   * System schemas (pg_catalog, information_schema, etc.) are automatically filtered out.
   *
   * @param input - The input containing metadata and datasource database map
   * @returns Promise resolving to a map of schema keys to SimpleSchema objects
   */
  public async execute(
    input: TransformMetadataToSimpleSchemaInput,
  ): Promise<Map<string, SimpleSchema>> {
    const { metadata, datasourceDatabaseMap } = input;
    const schemasMap = new Map<string, SimpleSchema>();

    // Group columns by table_id for quick lookup
    const columnsByTableId = new Map<number, typeof metadata.columns>();
    for (const col of metadata.columns) {
      // OPTIMIZATION: Skip system schemas early
      if (isSystemSchema(col.schema)) {
        continue;
      }
      if (!columnsByTableId.has(col.table_id)) {
        columnsByTableId.set(col.table_id, []);
      }
      columnsByTableId.get(col.table_id)!.push(col);
    }

    // Group tables by schema.database
    // Since metadata doesn't include database in tables, we need to infer it from columns
    // Columns have schema and table, and we can match them to datasources
    const tableToDatabase = new Map<string, string>(); // Map "schema.table" -> "database"

    // First, try to infer database from columns (columns might have database info in their schema)
    for (const col of metadata.columns) {
      // Skip system schemas
      if (isSystemSchema(col.schema)) {
        continue;
      }
      const tableKey = `${col.schema}.${col.table}`;
      if (!tableToDatabase.has(tableKey)) {
        // Try to match schema to datasource database name
        let databaseName = 'main';
        for (const dbName of datasourceDatabaseMap.values()) {
          // If schema name matches datasource database name, it's from that datasource
          if (col.schema === dbName) {
            databaseName = dbName;
            break;
          }
        }
        tableToDatabase.set(tableKey, databaseName);
      }
    }

    // Group tables by schema.database (filter out system tables and schemas)
    const tablesBySchemaKey = new Map<string, typeof metadata.tables>();
    for (const table of metadata.tables) {
      // OPTIMIZATION: Skip system schemas and tables early
      if (isSystemSchema(table.schema) || isSystemTable(table.name)) {
        continue;
      }
      const schemaName = table.schema || 'main';
      const tableKey = `${schemaName}.${table.name}`;
      const databaseName = tableToDatabase.get(tableKey) || 'main';
      const schemaKey = `${databaseName}.${schemaName}`;
      if (!tablesBySchemaKey.has(schemaKey)) {
        tablesBySchemaKey.set(schemaKey, []);
      }
      tablesBySchemaKey.get(schemaKey)!.push(table);
    }

    // Build SimpleSchema for each schema
    for (const [schemaKey, tables] of tablesBySchemaKey.entries()) {
      const parts = schemaKey.split('.');
      const databaseName = parts[0] || 'main';
      const schemaName = parts[1] || 'main';
      const isAttachedDb = databaseName !== 'main';

      const simpleTables: SimpleTable[] = [];
      for (const table of tables) {
        // Skip system tables again (double-check)
        if (isSystemTable(table.name)) {
          continue;
        }

        const columns = columnsByTableId.get(table.id) || [];
        const simpleColumns = columns
          .sort((a, b) => a.ordinal_position - b.ordinal_position)
          .map((col) => ({
            columnName: col.name,
            columnType: col.data_type,
          }));

        // Format table name: for attached databases, use datasourcename.schema.tablename
        let formattedTableName = table.name;
        if (isAttachedDb) {
          formattedTableName = `${databaseName}.${schemaName}.${table.name}`;
        }

        simpleTables.push({
          tableName: formattedTableName,
          columns: simpleColumns,
        });
      }

      schemasMap.set(schemaKey, {
        databaseName,
        schemaName,
        tables: simpleTables,
      });
    }

    return schemasMap;
  }
}
