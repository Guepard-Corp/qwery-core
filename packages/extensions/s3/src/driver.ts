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
import { type S3Config, schema } from './schema';

const escId = escapeSqlIdentifier;
const escStr = escapeSqlStringLiteral;
const SECRET_NAME = 's3_qwery';
const DEFAULT_VIEW = 'data';

/** Strips leading slashes via an index scan (no regex → no ReDoS surface). */
function trimLeadingSlashes(s: string): string {
  let i = 0;
  while (i < s.length && s[i] === '/') i++;
  return s.slice(i);
}

/** Strips leading + trailing slashes via index scans (no regex → no ReDoS surface). */
function trimSlashes(s: string): string {
  let start = 0;
  let end = s.length;
  while (start < end && s[start] === '/') start++;
  while (end > start && s[end - 1] === '/') end--;
  return s.slice(start, end);
}

/** `s3://bucket/<prefix>/<glob>` — the glob defaults to all files of the chosen format. */
export function buildS3UrlPattern(cfg: S3Config): string {
  const prefix = trimSlashes(cfg.prefix ?? '');
  const defaultGlob = cfg.format === 'parquet' ? '**/*.parquet' : '**/*.json';
  const firstInclude = cfg.includes?.[0];
  const include = firstInclude ? trimLeadingSlashes(firstInclude) : defaultGlob;
  const path = prefix ? `${prefix}/${include}` : include;
  return `s3://${cfg.bucket}/${path}`;
}

function resolveEndpointHost(cfg: S3Config): string | null {
  const raw = cfg.endpoint_url?.trim();
  let host = raw ? (raw.replace(/^https?:\/\//, '').split('/')[0] ?? null) : null;
  if (!host && cfg.provider === 'digitalocean' && cfg.region) {
    host = `${cfg.region}.digitaloceanspaces.com`;
  }
  // DigitalOcean expects the regionless host (vhost URL style prepends the bucket).
  if (host && cfg.provider === 'digitalocean') {
    const parts = host.split('.');
    if (parts.length === 4 && parts[2] === 'digitaloceanspaces' && parts[3] === 'com') {
      host = parts.slice(1).join('.');
    }
  }
  return host;
}

/** `CREATE OR REPLACE SECRET …` configuring DuckDB's httpfs S3 credentials. */
export function buildSecretSql(cfg: S3Config): string {
  const parts = [
    'TYPE s3',
    'PROVIDER config',
    `KEY_ID '${escStr(cfg.aws_access_key_id)}'`,
    `SECRET '${escStr(cfg.aws_secret_access_key)}'`,
    `REGION '${escStr(cfg.region)}'`,
  ];
  const token = cfg.aws_session_token?.trim();
  if (token) parts.push(`SESSION_TOKEN '${escStr(token)}'`);
  const host = resolveEndpointHost(cfg);
  if (host) {
    parts.push(`ENDPOINT '${escStr(host)}'`);
    parts.push(`URL_STYLE '${cfg.provider === 'digitalocean' ? 'vhost' : 'path'}'`);
  }
  return `CREATE OR REPLACE SECRET ${SECRET_NAME} (${parts.join(', ')});`;
}

function readExpr(cfg: S3Config): string {
  const url = escStr(buildS3UrlPattern(cfg));
  return cfg.format === 'parquet' ? `read_parquet('${url}')` : `read_json_auto('${url}')`;
}

async function configure(conn: QueryEngineConnection, cfg: S3Config): Promise<void> {
  await conn.run('INSTALL httpfs;');
  await conn.run('LOAD httpfs;');
  await conn.run(buildSecretSql(cfg));
}

export const driverFactory = makeDriver((context: DriverContext): IDataSourceDriver => {
  const cfg: S3Config = schema.parse(context.config);

  const requireConn = (): QueryEngineConnection => {
    const conn = getQueryEngineConnection(context);
    if (!conn) throw new Error('s3: queryEngineConnection is required in DriverContext');
    return conn;
  };

  return {
    async testConnection(): Promise<void> {
      const conn = requireConn();
      await withTimeout(
        (async () => {
          await configure(conn, cfg);
          const reader = await conn.runAndReadAll(`SELECT 1 FROM ${readExpr(cfg)} LIMIT 1`);
          await reader.readAll();
        })(),
        DEFAULT_CONNECTION_TEST_TIMEOUT_MS,
        `s3: could not read '${buildS3UrlPattern(cfg)}' within ${DEFAULT_CONNECTION_TEST_TIMEOUT_MS}ms. Check credentials, region, endpoint and that matching ${cfg.format} files exist.`,
      );
      context.logger?.info?.('s3: testConnection ok');
    },

    async metadata(): Promise<DatasourceMetadata> {
      const conn = requireConn();
      await configure(conn, cfg);
      const reader = await conn.runAndReadAll(`DESCRIBE SELECT * FROM ${readExpr(cfg)}`);
      await reader.readAll();
      return metadataFromDescribeRows({
        driver: 's3.duckdb',
        schema: 'main',
        table: DEFAULT_VIEW,
        rows: reader.getRowObjectsJS() as DuckDbDescribeRow[],
      });
    },

    async query(sql: string): Promise<DatasourceResultSet> {
      const conn = requireConn();
      const reader = await conn.runAndReadAll(sql);
      await reader.readAll();
      return resultSetFromReader(reader);
    },

    async attach(options: DriverAttachOptions): Promise<DriverAttachResult> {
      const conn = requireConn();
      await configure(conn, cfg);
      const schemaName = options.schemaName ?? 'main';
      const viewName = options.viewName ?? DEFAULT_VIEW;
      await conn.run(
        `CREATE OR REPLACE VIEW "${escId(schemaName)}"."${escId(viewName)}" AS ` +
          `SELECT * FROM ${readExpr(cfg)}`,
      );
      context.logger?.info?.(`s3: attached as ${schemaName}.${viewName}`);
      return {
        tables: [{ schema: schemaName, table: viewName, path: `${schemaName}.${viewName}` }],
      };
    },

    async detach(options: DriverDetachOptions): Promise<void> {
      const conn = requireConn();
      const schemaName = options.schemaName ?? 'main';
      const tables = options.tableNames ?? [DEFAULT_VIEW];
      for (const t of tables) {
        await conn.run(`DROP VIEW IF EXISTS "${escId(schemaName)}"."${escId(t)}"`);
      }
    },
  };
});

export default driverFactory;
