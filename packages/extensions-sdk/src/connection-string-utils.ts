/**
 * Connection String Utilities
 *
 * Centralized utilities for extracting and building connection strings
 * from various input formats (connectionUrl or separate fields).
 */

export interface ConnectionFields {
  host?: string;
  port?: number;
  username?: string;
  user?: string;
  password?: string;
  database?: string;
  ssl?: boolean;
  sslmode?: string;
}

/**
 * Extract a generic URL from config with fallback keys
 */
export function extractGenericUrl(
  config: Record<string, unknown>,
  keys: string[],
): string | null {
  for (const key of keys) {
    const value = config[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

/**
 * Extract a path from config with fallback keys
 */
export function extractPath(
  config: Record<string, unknown>,
  keys: string[],
): string | null {
  return extractGenericUrl(config, keys);
}

/**
 * Build PostgreSQL connection URL from separate fields
 */
export function buildPostgresConnectionUrl(fields: ConnectionFields): string {
  const host = fields.host || 'localhost';
  const port = fields.port || 5432;
  const username = fields.username || fields.user || '';
  const password = fields.password || '';
  const database = fields.database || '';
  const sslmode = fields.sslmode || 'prefer';

  // Build URL
  let url = `postgresql://`;
  if (username || password) {
    const encodedUser = username ? encodeURIComponent(username) : '';
    const encodedPass = password ? encodeURIComponent(password) : '';
    url += `${encodedUser}${encodedPass ? `:${encodedPass}` : ''}@`;
  }
  url += `${host}:${port}`;
  if (database) {
    url += `/${database}`;
  }
  if (sslmode) {
    url += `?sslmode=${sslmode}`;
  }

  return url;
}

/**
 * Build MySQL connection string from separate fields
 * Returns space-separated format for DuckDB compatibility
 */
export function buildMysqlConnectionUrl(fields: ConnectionFields): string {
  const host = fields.host || 'localhost';
  const port = fields.port || 3306;
  const user = fields.username || fields.user || 'root';
  const password = fields.password || '';
  const database = fields.database || '';

  // DuckDB MySQL extension uses space-separated format
  return `host=${host} port=${port} user=${user} password=${password} database=${database}`;
}

/**
 * Build ClickHouse HTTP URL from separate fields
 */
export function buildClickHouseConnectionUrl(
  fields: ConnectionFields,
): string {
  const host = fields.host || 'localhost';
  const port = fields.port || 8123;
  const username = fields.username || fields.user || 'default';
  const password = fields.password || '';
  const database = fields.database || 'default';

  // ClickHouse HTTP interface format
  let url = `http://${host}:${port}`;
  if (username || password) {
    const encodedUser = username ? encodeURIComponent(username) : '';
    const encodedPass = password ? encodeURIComponent(password) : '';
    url = `http://${encodedUser}${encodedPass ? `:${encodedPass}` : ''}@${host}:${port}`;
  }
  if (database && database !== 'default') {
    url += `?database=${encodeURIComponent(database)}`;
  }

  return url;
}

/**
 * Clean PostgreSQL connection URL
 * Removes channel_binding parameter and ensures sslmode is set
 */
export function cleanPostgresConnectionUrl(connectionUrl: string): string {
  try {
    const url = new URL(connectionUrl);
    url.searchParams.delete('channel_binding');

    // Ensure sslmode is present
    if (!url.searchParams.has('sslmode')) {
      url.searchParams.set('sslmode', 'prefer');
    } else if (url.searchParams.get('sslmode') === 'disable') {
      url.searchParams.set('sslmode', 'prefer');
    }

    return url.toString();
  } catch {
    // Fallback: simple string replacement if URL parsing fails
    let cleaned = connectionUrl;
    // Remove channel_binding parameter using regex
    cleaned = cleaned.replace(/[&?]channel_binding=[^&]*/g, '');
    cleaned = cleaned.replace(/channel_binding=[^&]*&?/g, '');
    // Change sslmode=disable to prefer (servers require SSL)
    cleaned = cleaned.replace(/sslmode=disable/g, 'sslmode=prefer');
    // Ensure sslmode is present if it was removed
    if (!cleaned.includes('sslmode=')) {
      if (cleaned.includes('?')) {
        cleaned += '&sslmode=prefer';
      } else {
        cleaned += '?sslmode=prefer';
      }
    }
    return cleaned;
  }
}

/**
 * Extract connection URL from config for a specific provider
 * Supports both connectionUrl and separate fields
 */
export function extractConnectionUrl(
  config: Record<string, unknown>,
  providerId: string,
): string {
  // Try connectionUrl first
  const connectionUrl = extractGenericUrl(config, [
    'connectionUrl',
    'url',
    'path',
  ]);
  if (connectionUrl) {
    // Clean PostgreSQL URLs
    if (providerId === 'postgresql' || providerId === 'postgres') {
      return cleanPostgresConnectionUrl(connectionUrl);
    }
    return connectionUrl;
  }

  // Build from separate fields
  const fields: ConnectionFields = {
    host: config.host as string | undefined,
    port: config.port as number | undefined,
    username: (config.username || config.user) as string | undefined,
    user: config.user as string | undefined,
    password: config.password as string | undefined,
    database: config.database as string | undefined,
    ssl: config.ssl as boolean | undefined,
    sslmode: config.sslmode as string | undefined,
  };

  switch (providerId) {
    case 'postgresql':
    case 'postgres':
      if (!fields.host) {
        throw new Error(
          'PostgreSQL datasource requires connectionUrl or host in config',
        );
      }
      return buildPostgresConnectionUrl(fields);

    case 'mysql':
      if (!fields.host) {
        throw new Error('MySQL datasource requires connectionUrl or host in config');
      }
      return buildMysqlConnectionUrl(fields);

    case 'clickhouse-node':
    case 'clickhouse-web':
    case 'clickhouse':
      if (!fields.host) {
        throw new Error(
          'ClickHouse datasource requires connectionUrl or host in config',
        );
      }
      return buildClickHouseConnectionUrl(fields);

    case 'sqlite':
    case 'duckdb':
      const path = extractPath(config, ['path', 'database', 'connectionUrl']);
      if (!path) {
        throw new Error(
          'SQLite/DuckDB datasource requires path, database, or connectionUrl in config',
        );
      }
      return path;

    default:
      throw new Error(
        `Unsupported provider for connection string extraction: ${providerId}`,
      );
  }
}
