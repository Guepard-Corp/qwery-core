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
import { type JsonOnlineConfig, schema } from './schema';

const escId = escapeSqlIdentifier;
const escStr = escapeSqlStringLiteral;

async function ensureHttpfs(conn: QueryEngineConnection): Promise<void> {
  await conn.run('INSTALL httpfs;');
  await conn.run('LOAD httpfs;');
}

export const driverFactory = makeDriver((context: DriverContext): IDataSourceDriver => {
  const config: JsonOnlineConfig = schema.parse(context.config);

  return {
    async testConnection(): Promise<void> {
      const conn = getQueryEngineConnection(context);
      if (!conn) {
        throw new Error('json-online: queryEngineConnection is required in DriverContext');
      }
      await withTimeout(
        (async () => {
          await ensureHttpfs(conn);
          const reader = await conn.runAndReadAll(
            `SELECT COUNT(*) AS rows FROM read_json_auto('${escStr(config.url)}') LIMIT 1`,
          );
          await reader.readAll();
        })(),
        DEFAULT_CONNECTION_TEST_TIMEOUT_MS,
        `json-online: could not read '${config.url}' within ${DEFAULT_CONNECTION_TEST_TIMEOUT_MS}ms.`,
      );
      context.logger?.info?.('json-online: testConnection ok');
    },

    async metadata(): Promise<DatasourceMetadata> {
      const conn = getQueryEngineConnection(context);
      if (!conn) throw new Error('json-online: queryEngineConnection is required');
      await ensureHttpfs(conn);
      const reader = await conn.runAndReadAll(
        `DESCRIBE SELECT * FROM read_json_auto('${escStr(config.url)}')`,
      );
      await reader.readAll();
      return metadataFromDescribeRows({
        driver: 'json-online.duckdb',
        schema: 'main',
        table: config.viewName,
        rows: reader.getRowObjectsJS() as DuckDbDescribeRow[],
      });
    },

    async query(sql: string): Promise<DatasourceResultSet> {
      const conn = getQueryEngineConnection(context);
      if (!conn) throw new Error('json-online: queryEngineConnection is required');
      const reader = await conn.runAndReadAll(sql);
      await reader.readAll();
      return resultSetFromReader(reader);
    },

    async attach(options: DriverAttachOptions): Promise<DriverAttachResult> {
      const conn = getQueryEngineConnection(context);
      if (!conn) throw new Error('json-online: queryEngineConnection is required');
      await ensureHttpfs(conn);
      const schemaName = options.schemaName ?? 'main';
      const viewName = options.viewName ?? config.viewName;
      await conn.run(
        `CREATE OR REPLACE VIEW "${escId(schemaName)}"."${escId(viewName)}" AS ` +
          `SELECT * FROM read_json_auto('${escStr(config.url)}')`,
      );
      context.logger?.info?.(`json-online: attached as ${schemaName}.${viewName}`);
      return {
        tables: [{ schema: schemaName, table: viewName, path: `${schemaName}.${viewName}` }],
      };
    },

    async detach(options: DriverDetachOptions): Promise<void> {
      const conn = getQueryEngineConnection(context);
      if (!conn) throw new Error('json-online: queryEngineConnection is required');
      const schemaName = options.schemaName ?? 'main';
      const tables = options.tableNames ?? [config.viewName];
      for (const t of tables) {
        await conn.run(`DROP VIEW IF EXISTS "${escId(schemaName)}"."${escId(t)}"`);
      }
    },
  };
});

export default driverFactory;
