import type { Datasource } from '@qwery/domain/entities';
import type { SimpleSchema } from '@qwery/domain/entities';
import type { DuckDBInstance } from '@duckdb/node-api';
import { datasourceAttachmentService } from './datasource-attachment-service';
import { ForeignDatabaseAttachmentStrategy } from './datasource-attachment/strategies/foreign-database-attachment-strategy';
import { getLogger } from '@qwery/shared/logger';

// Connection type from DuckDB instance
type Connection = Awaited<ReturnType<DuckDBInstance['connect']>>;

export interface ForeignDatasourceAttachOptions {
  connection: Connection; // Changed from dbPath
  datasource: Datasource;
  extractSchema?: boolean; // Default: true for backward compatibility, set to false to skip schema extraction
}

export interface AttachResult {
  attachedDatabaseName: string;
  tables: Array<{
    schema: string;
    table: string;
    path: string;
    schemaDefinition?: SimpleSchema;
  }>;
}

export interface AttachToConnectionOptions {
  conn: Awaited<
    ReturnType<
      Awaited<
        ReturnType<typeof import('@duckdb/node-api').DuckDBInstance.create>
      >['connect']
    >
  >;
  datasource: Datasource;
  conversationId?: string;
  workspace?: string;
}

/**
 * Attach a foreign datasource to an existing DuckDB connection
 * This is used when you already have a connection and need to attach datasources
 * (since DuckDB attachments are session-scoped)
 *
 * @deprecated This function is kept for backward compatibility.
 * It delegates to the unified datasource attachment service.
 */
export async function attachForeignDatasourceToConnection(
  opts: AttachToConnectionOptions & {
    conversationId?: string;
    workspace?: string;
  },
): Promise<void> {
  // Delegate to unified attachment service
  await datasourceAttachmentService.attachDatasourceToConnection({
    connection: opts.conn,
    datasource: opts.datasource,
    conversationId: opts.conversationId,
    workspace: opts.workspace,
  });
}

/**
 * Attach all foreign datasources for a conversation to an existing connection
 * This ensures foreign datasources are available for queries (since attachments are session-scoped)
 */
export async function attachAllForeignDatasourcesToConnection(opts: {
  conn: Awaited<
    ReturnType<
      Awaited<
        ReturnType<typeof import('@duckdb/node-api').DuckDBInstance.create>
      >['connect']
    >
  >;
  datasourceIds: string[];
  datasourceRepository: import('@qwery/domain/repositories').IDatasourceRepository;
}): Promise<void> {
  const { conn, datasourceIds, datasourceRepository } = opts;

  if (!datasourceIds || datasourceIds.length === 0) {
    return;
  }

  const { loadDatasources, groupDatasourcesByType } = await import(
    './datasource-loader'
  );

  try {
    const loaded = await loadDatasources(datasourceIds, datasourceRepository);
    const { foreignDatabases } = groupDatasourcesByType(loaded);

    for (const { datasource } of foreignDatabases) {
      try {
        await attachForeignDatasourceToConnection({ conn, datasource });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        // Only warn if it's not a "skip" case (missing config returns early, not an error)
        // Log but don't fail - other datasources might still work
        if (
          !errorMsg.includes('already attached') &&
          !errorMsg.includes('already exists')
        ) {
          const logger = await getLogger();
          logger.warn(
            `[ReadDataAgent] Failed to attach datasource ${datasource.id}: ${errorMsg}`,
          );
        }
      }
    }
  } catch (error) {
    // Log but don't fail - query might still work with other datasources
    const logger = await getLogger();
    logger.warn(
      '[ForeignDatasourceAttach] Failed to load datasources for attachment:',
      error,
    );
  }
}

/**
 * Attach a foreign database to DuckDB and create views
 * Supports PostgreSQL, MySQL, SQLite, etc. via DuckDB foreign data wrappers
 *
 * @deprecated This function is kept for backward compatibility but is no longer used.
 * Use the unified datasource attachment service instead.
 */
export async function attachForeignDatasource(
  opts: ForeignDatasourceAttachOptions,
): Promise<AttachResult> {
  const { connection, datasource, extractSchema = true } = opts;

  // Use ForeignDatabaseAttachmentStrategy directly to get full AttachResult
  const strategy = new ForeignDatabaseAttachmentStrategy();
  const result = await strategy.attach({
    connection,
    datasource,
    extractSchema,
  });

  // Convert AttachmentResult to AttachResult format
  if (result.attachedDatabaseName && result.tables) {
    return {
      attachedDatabaseName: result.attachedDatabaseName,
      tables: result.tables.map((t) => ({
        schema: t.schema,
        table: t.table,
        path: t.path,
        schemaDefinition: t.schemaDefinition,
      })),
    };
  }

  throw new Error(
    'attachForeignDatasource: Unexpected result format from attachment strategy',
  );
}
