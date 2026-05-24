import {
  type DatasourceMetadata,
  type DatasourceResultSet,
  DEFAULT_CONNECTION_TEST_TIMEOUT_MS,
  type DriverAttachOptions,
  type DriverAttachResult,
  type DriverContext,
  type DriverDetachOptions,
  type DuckDbDescribeRow,
  escapeSqlIdentifier,
  escapeSqlStringLiteral,
  getQueryEngineConnection,
  type IDataSourceDriver,
  makeDriver,
  metadataFromDescribeRows,
  type QueryEngineConnection,
  resultSetFromReader,
  withTimeout,
} from '@qwery/extension-sdk';
import { isRemoteSource, type ParquetConfig, schema } from './schema';

const escId = escapeSqlIdentifier;
const escStr = escapeSqlStringLiteral;

async function ensureHttpfs(conn: QueryEngineConnection, source: string): Promise<void> {
  if (!isRemoteSource(source)) return;
  await conn.run('INSTALL httpfs;');
  await conn.run('LOAD httpfs;');
}

export const driverFactory = makeDriver((context: DriverContext): IDataSourceDriver => {
  const config: ParquetConfig = schema.parse(context.config);

  return {
    async testConnection(): Promise<void> {
      const conn = getQueryEngineConnection(context);
      if (!conn) {
        throw new Error('parquet: queryEngineConnection is required in DriverContext');
      }
      await withTimeout(
        (async () => {
          await ensureHttpfs(conn, config.source);
          const reader = await conn.runAndReadAll(
            `SELECT COUNT(*) AS rows FROM read_parquet('${escStr(config.source)}') LIMIT 1`,
          );
          await reader.readAll();
        })(),
        DEFAULT_CONNECTION_TEST_TIMEOUT_MS,
        `parquet: could not read '${config.source}' within ${DEFAULT_CONNECTION_TEST_TIMEOUT_MS}ms.`,
      );
      context.logger?.info?.('parquet: testConnection ok');
    },

    async metadata(): Promise<DatasourceMetadata> {
      const conn = getQueryEngineConnection(context);
      if (!conn) throw new Error('parquet: queryEngineConnection is required');
      await ensureHttpfs(conn, config.source);
      const reader = await conn.runAndReadAll(
        `DESCRIBE SELECT * FROM read_parquet('${escStr(config.source)}')`,
      );
      await reader.readAll();
      return metadataFromDescribeRows({
        driver: 'parquet.duckdb',
        schema: 'main',
        table: config.viewName,
        rows: reader.getRowObjectsJS() as DuckDbDescribeRow[],
      });
    },

    async query(sql: string): Promise<DatasourceResultSet> {
      const conn = getQueryEngineConnection(context);
      if (!conn) throw new Error('parquet: queryEngineConnection is required');
      const reader = await conn.runAndReadAll(sql);
      await reader.readAll();
      return resultSetFromReader(reader);
    },

    async attach(options: DriverAttachOptions): Promise<DriverAttachResult> {
      const conn = getQueryEngineConnection(context);
      if (!conn) throw new Error('parquet: queryEngineConnection is required');
      await ensureHttpfs(conn, config.source);
      const schemaName = options.schemaName ?? 'main';
      const viewName = options.viewName ?? config.viewName;
      await conn.run(
        `CREATE OR REPLACE VIEW "${escId(schemaName)}"."${escId(viewName)}" AS ` +
          `SELECT * FROM read_parquet('${escStr(config.source)}')`,
      );
      context.logger?.info?.(`parquet: attached as ${schemaName}.${viewName}`);
      return {
        tables: [{ schema: schemaName, table: viewName, path: `${schemaName}.${viewName}` }],
      };
    },

    async detach(options: DriverDetachOptions): Promise<void> {
      const conn = getQueryEngineConnection(context);
      if (!conn) throw new Error('parquet: queryEngineConnection is required');
      const schemaName = options.schemaName ?? 'main';
      const tables = options.tableNames ?? [config.viewName];
      for (const t of tables) {
        await conn.run(`DROP VIEW IF EXISTS "${escId(schemaName)}"."${escId(t)}"`);
      }
    },
  };
});

export default driverFactory;
