import type { Datasource, SimpleSchema } from '@qwery/domain/entities';
import type { DuckDBInstance } from '@duckdb/node-api';
import type { AttachmentResult } from './datasource-attachment/types';
import { DuckDBNativeAttachmentStrategy } from './datasource-attachment/strategies/duckdb-native-attachment-strategy';
import { ForeignDatabaseAttachmentStrategy } from './datasource-attachment/strategies/foreign-database-attachment-strategy';
import { ClickHouseAttachmentStrategy } from './datasource-attachment/strategies/clickhouse-attachment-strategy';
import {
  GSheetAttachmentStrategy,
  getGSheetDriverWithConnection,
} from './datasource-attachment/strategies/gsheet-attachment-strategy';
import { getParquetDriverWithConnection } from './datasource-attachment/strategies/parquet-attachment-strategy';
import { getDatasourceDatabaseName } from './datasource-name-utils';
import { getProviderMapping } from './provider-registry';
import type {
  GSheetAttachmentOptions,
  ClickHouseAttachmentOptions,
} from './datasource-attachment/types';
import { getLogger } from '@qwery/shared/logger';

// Connection type from DuckDB instance
type Connection = Awaited<ReturnType<DuckDBInstance['connect']>>;

export interface DatasourceAttachmentOptions {
  connection: Connection;
  datasource: Datasource;
  conversationId?: string;
  workspace?: string;
  extractSchema?: boolean; // For foreign databases
}

export interface CreateViewResult {
  viewName: string;
  displayName: string;
  schema: SimpleSchema;
}

/**
 * Unified service for attaching datasources to DuckDB
 * Uses strategy pattern to handle different datasource types
 */
export class DatasourceAttachmentService {
  private strategies = [
    new GSheetAttachmentStrategy(),
    new ClickHouseAttachmentStrategy(),
    new DuckDBNativeAttachmentStrategy(),
    new ForeignDatabaseAttachmentStrategy(), // Must be last as fallback
  ];

  /**
   * Attach a datasource to DuckDB connection
   * Returns result compatible with existing datasourceToDuckdb() interface
   */
  async attachDatasource(
    options: DatasourceAttachmentOptions,
  ): Promise<CreateViewResult> {
    const { connection, datasource, conversationId, workspace, extractSchema } =
      options;
    const provider = datasource.datasource_provider;

    const logger = await getLogger();

    // For gsheet-csv: try driver.attach first (extension owns attach logic)
    if (provider === 'gsheet-csv' && conversationId && workspace) {
      const driverWithAttach = await getGSheetDriverWithConnection(connection);
      if (driverWithAttach) {
        try {
          const schemaName = getDatasourceDatabaseName(datasource);
          const driverResult = await driverWithAttach.attach({
            config: datasource.config,
            schemaName,
            conversationId,
            workspace,
          });
          if (driverResult.tables.length > 0) {
            const first = driverResult.tables[0]!;
            let schemaDefinition: SimpleSchema | undefined;
            try {
              const escapedSchema = first.schema.replace(/"/g, '""');
              const escapedTable = first.table.replace(/"/g, '""');
              const describeReader = await connection.runAndReadAll(
                `DESCRIBE "${escapedSchema}"."${escapedTable}"`,
              );
              await describeReader.readAll();
              const rows = describeReader.getRowObjectsJS() as Array<{
                column_name: string;
                column_type: string;
              }>;
              schemaDefinition = {
                databaseName: schemaName,
                schemaName: first.schema,
                tables: [
                  {
                    tableName: first.table,
                    columns: rows.map((r) => ({
                      columnName: r.column_name,
                      columnType: r.column_type,
                    })),
                  },
                ],
              };
            } catch {
              // ignore
            }
            if (schemaDefinition) {
              return {
                viewName: first.path,
                displayName: first.table,
                schema: schemaDefinition,
              };
            }
          }
        } catch (error) {
          logger.debug(
            '[DatasourceAttachmentService] gsheet-csv driver.attach failed, falling back to strategy:',
            error,
          );
        }
      }
    }

    // For parquet-online: try driver.attach first (extension owns attach logic)
    if (provider === 'parquet-online') {
      const driverWithAttach = await getParquetDriverWithConnection(connection);
      if (driverWithAttach) {
        try {
          const schemaName = getDatasourceDatabaseName(datasource);
          const driverResult = await driverWithAttach.attach({
            config: datasource.config,
            schemaName,
            conversationId,
            workspace,
          });
          if (driverResult.tables.length > 0) {
            const first = driverResult.tables[0]!;
            let schemaDefinition: SimpleSchema | undefined;
            try {
              const escapedSchema = first.schema.replace(/"/g, '""');
              const escapedTable = first.table.replace(/"/g, '""');
              const describeReader = await connection.runAndReadAll(
                `DESCRIBE "${escapedSchema}"."${escapedTable}"`,
              );
              await describeReader.readAll();
              const rows = describeReader.getRowObjectsJS() as Array<{
                column_name: string;
                column_type: string;
              }>;
              schemaDefinition = {
                databaseName: schemaName,
                schemaName: first.schema,
                tables: [
                  {
                    tableName: first.table,
                    columns: rows.map((r) => ({
                      columnName: r.column_name,
                      columnType: r.column_type,
                    })),
                  },
                ],
              };
            } catch {
              // ignore
            }
            if (schemaDefinition) {
              return {
                viewName: first.path,
                displayName: first.table,
                schema: schemaDefinition,
              };
            }
          }
        } catch (error) {
          logger.debug(
            '[DatasourceAttachmentService] parquet-online driver.attach failed, falling back to strategy:',
            error,
          );
        }
      }
    }

    // Find appropriate strategy
    let strategy = this.strategies.find((s) => s.canHandle(provider));
    logger.debug('strategy', strategy);

    // For foreign databases, check if provider-registry can handle it
    if (!strategy || strategy instanceof ForeignDatabaseAttachmentStrategy) {
      const mapping = await getProviderMapping(provider);
      if (mapping) {
        // Use foreign database strategy
        strategy = this.strategies.find(
          (s) => s instanceof ForeignDatabaseAttachmentStrategy,
        )!;
      } else if (!strategy) {
        throw new Error(
          `No attachment strategy found for provider: ${provider}`,
        );
      }
    }

    // Attach using strategy
    // For strategies that require conversationId/workspace, we need to ensure they're provided
    let result: AttachmentResult;
    if (
      strategy instanceof GSheetAttachmentStrategy ||
      strategy instanceof ClickHouseAttachmentStrategy
    ) {
      if (!conversationId || !workspace) {
        throw new Error(
          `${provider} requires conversationId and workspace for persistent database attachment`,
        );
      }
      result = await strategy.attach({
        connection,
        datasource,
        conversationId,
        workspace,
        extractSchema,
      } as GSheetAttachmentOptions | ClickHouseAttachmentOptions);
    } else {
      result = await strategy.attach({
        connection,
        datasource,
        conversationId,
        workspace,
        extractSchema,
      });
    }

    // Convert result to CreateViewResult format for backward compatibility
    if (result.viewName && result.schema) {
      return {
        viewName: result.viewName,
        displayName: result.displayName || result.viewName,
        schema: result.schema,
      };
    }

    // For attached databases (foreign databases, GSheet, ClickHouse), return first table
    if (
      result.attachedDatabaseName &&
      result.tables &&
      result.tables.length > 0
    ) {
      const firstTable = result.tables[0]!;
      if (firstTable.schemaDefinition) {
        return {
          viewName: firstTable.path,
          displayName: firstTable.table,
          schema: firstTable.schemaDefinition,
        };
      }
      // If no schema definition, try to extract it
      // This shouldn't happen for GSheet/ClickHouse, but handle gracefully
      throw new Error(
        `Failed to attach datasource ${datasource.id}: No schema definition for first table`,
      );
    }

    throw new Error(
      `Failed to attach datasource ${datasource.id}: No view or table created`,
    );
  }

  /**
   * Attach a datasource without returning schema (for connection-only attachment)
   */
  async attachDatasourceToConnection(
    options: DatasourceAttachmentOptions,
  ): Promise<void> {
    const { connection, datasource, conversationId, workspace } = options;
    const provider = datasource.datasource_provider;

    if (provider === 'gsheet-csv') {
      if (!conversationId || !workspace) {
        throw new Error(
          'gsheet-csv requires conversationId and workspace for persistent database attachment',
        );
      }
      const strategy = this.strategies.find(
        (s) => s instanceof GSheetAttachmentStrategy,
      )!;
      await strategy.attach({
        connection,
        datasource,
        conversationId: conversationId!,
        workspace: workspace!,
        extractSchema: true,
      });
      return;
    }

    // Check if it's a foreign database
    const mapping = await getProviderMapping(provider);
    if (mapping) {
      const strategy = this.strategies.find(
        (s) => s instanceof ForeignDatabaseAttachmentStrategy,
      )!;
      await strategy.attach({
        connection,
        datasource,
        extractSchema: false,
      });
      return;
    }

    await this.attachDatasource(options);
  }
}

// Export singleton instance
export const datasourceAttachmentService = new DatasourceAttachmentService();

// Export convenience function for backward compatibility
export async function attachDatasource(
  options: DatasourceAttachmentOptions,
): Promise<CreateViewResult> {
  return datasourceAttachmentService.attachDatasource(options);
}
