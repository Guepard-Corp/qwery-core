import type { SimpleSchema, SimpleTable } from '../../entities';
import type {
  TransformMetadataToSimpleSchemaInput,
  TransformMetadataToSimpleSchemaUseCase,
} from '../../usecases';

/**
 * Service to transform DatasourceMetadata to SimpleSchema format.
 * Groups tables by schema and formats table names for attached databases.
 */
export class TransformMetadataToSimpleSchemaService
  implements TransformMetadataToSimpleSchemaUseCase
{
  /**
   * Transform DatasourceMetadata to a map of SimpleSchema objects.
   * The map key is in the format "databaseName.schemaName".
   *
   * @param input - The input containing metadata and datasource database map
   * @returns Promise resolving to a map of schema keys to SimpleSchema objects
   */
  public async execute(
    input: TransformMetadataToSimpleSchemaInput,
  ): Promise<Map<string, SimpleSchema>> {
    const { metadata, datasourceDatabaseMap, datasourceProviderMap } = input;
    const schemasMap = new Map<string, SimpleSchema>();
    
    // Build map: datasource database name -> provider (for path formatting)
    const databaseToProvider = new Map<string, string>();
    if (datasourceProviderMap) {
      for (const [datasourceId, provider] of datasourceProviderMap.entries()) {
        const dbName = datasourceDatabaseMap.get(datasourceId);
        if (dbName) {
          databaseToProvider.set(dbName, provider);
        }
      }
    }

    // Group columns by table_id for quick lookup
    const columnsByTableId = new Map<number, typeof metadata.columns>();
    for (const col of metadata.columns) {
      if (!columnsByTableId.has(col.table_id)) {
        columnsByTableId.set(col.table_id, []);
      }
      columnsByTableId.get(col.table_id)!.push(col);
    }

    // Group tables by schema.database
    // Since metadata doesn't include database in tables, we need to infer it from columns
    // Columns have schema and table, and we can match them to datasources
    const tableToDatabase = new Map<string, string>(); // Map "schema.table" -> "database"

    // First, try to infer database from columns
    // Priority: 1) Use database field from column (table_catalog), 2) Match schema to datasource name
    for (const col of metadata.columns) {
      const tableKey = `${col.schema}.${col.table}`;
      if (!tableToDatabase.has(tableKey)) {
        let databaseName = 'main';
        
        // First, try to use database field from column (table_catalog from DuckDB)
        const colDatabase = (col as { database?: string }).database;
        if (colDatabase && colDatabase !== 'main' && colDatabase !== 'memory') {
          // Check if this database name matches a datasource database name
          for (const dbName of datasourceDatabaseMap.values()) {
            if (colDatabase === dbName || colDatabase.toLowerCase() === dbName.toLowerCase()) {
              databaseName = dbName;
              break;
            }
          }
          // If not found in datasource map, use it directly (might be correct)
          if (databaseName === 'main' && colDatabase !== 'main') {
            databaseName = colDatabase;
          }
        }
        
        // Fallback: try to match schema to datasource database name (for cases where database field isn't available)
        if (databaseName === 'main') {
          for (const dbName of datasourceDatabaseMap.values()) {
            // If schema name matches datasource database name, it's from that datasource
            if (col.schema === dbName) {
              databaseName = dbName;
              break;
            }
          }
        }
        
        tableToDatabase.set(tableKey, databaseName);
      }
    }

    // Group tables by schema.database
    const tablesBySchemaKey = new Map<string, typeof metadata.tables>();
    for (const table of metadata.tables) {
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
        const columns = columnsByTableId.get(table.id) || [];
        const simpleColumns = columns
          .sort((a, b) => a.ordinal_position - b.ordinal_position)
          .map((col) => ({
            columnName: col.name,
            columnType: col.data_type,
          }));

        // Format table name: for attached databases, use datasourcename.schema.tablename
        // Exception: for gsheet-csv (two-part providers), use datasourcename.tablename
        let formattedTableName = table.name;
        if (isAttachedDb) {
          const provider = databaseToProvider.get(databaseName);
          // Check if this is a two-part path provider (e.g., gsheet-csv)
          // For SQLite attached databases (like gsheet-csv), DuckDB reports schema='main'
          // but we need to use two-part format: {datasource_name}.{table_name}
          const isTwoPartProvider = provider === 'gsheet-csv';
          
          if (isTwoPartProvider) {
            // Two-part path: {datasource_name}.{table_name} (e.g., gsheet-csv)
            formattedTableName = `${databaseName}.${table.name}`;
          } else {
            // Three-part path: {datasource_name}.{schema}.{table_name} (e.g., postgresql)
            formattedTableName = `${databaseName}.${schemaName}.${table.name}`;
          }
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
