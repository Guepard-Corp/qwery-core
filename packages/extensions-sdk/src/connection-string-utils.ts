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
  const sslmode =
    fields.sslmode || (fields.ssl === true ? 'require' : 'prefer');

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
 * Build MySQL connection URL from separate fields
 * Returns mysql:// URL format for mysql2 driver compatibility
 */
export function buildMysqlConnectionUrl(fields: ConnectionFields): string {
  const host = fields.host || 'localhost';
  const port = fields.port || 3306;
  const user = fields.username || fields.user || 'root';
  const password = fields.password || '';
  const database = fields.database || '';

  // Build mysql:// URL format
  let url = `mysql://`;
  if (user || password) {
    const encodedUser = user ? encodeURIComponent(user) : '';
    const encodedPass = password ? encodeURIComponent(password) : '';
    url += `${encodedUser}${encodedPass ? `:${encodedPass}` : ''}@`;
  }
  url += `${host}:${port}`;
  if (database) {
    url += `/${database}`;
  }
  if (fields.ssl === true) {
    url += `${url.includes('?') ? '&' : '?'}ssl=true`;
  }

  return url;
}

/**
 * Build ClickHouse HTTP URL from separate fields
 */
export function buildClickHouseConnectionUrl(fields: ConnectionFields): string {
  const host = fields.host || 'localhost';
  const port = fields.port || (fields.ssl === true ? 8443 : 8123);
  const username = fields.username || fields.user || 'default';
  const password = fields.password || '';
  const database = fields.database || 'default';
  const protocol = fields.ssl === true ? 'https' : 'http';

  // ClickHouse HTTP interface format
  let url = `${protocol}://${host}:${port}`;
  if (username || password) {
    const encodedUser = username ? encodeURIComponent(username) : '';
    const encodedPass = password ? encodeURIComponent(password) : '';
    url = `${protocol}://${encodedUser}${encodedPass ? `:${encodedPass}` : ''}@${host}:${port}`;
  }
  if (database && database !== 'default') {
    url += `?database=${encodeURIComponent(database)}`;
  }

  return url;
}

/**
 * Clean PostgreSQL connection URL
 * Removes channel_binding parameter.
 */
export function cleanPostgresConnectionUrl(connectionUrl: string): string {
  try {
    const url = new URL(connectionUrl);
    url.searchParams.delete('channel_binding');

    // Handle sslmode parameter
    const sslmode = url.searchParams.get('sslmode');
    if (sslmode === 'disable') {
      url.searchParams.set('sslmode', 'prefer');
    } else if (!sslmode) {
      url.searchParams.set('sslmode', 'prefer');
    }

    return url.toString();
  } catch {
    // Fallback: simple string replacement if URL parsing fails
    let cleaned = connectionUrl;
    // Remove channel_binding parameter using regex
    cleaned = cleaned.replace(/[&?]channel_binding=[^&]*/g, '');
    cleaned = cleaned.replace(/channel_binding=[^&]*&?/g, '');

    // Handle sslmode parameter
    if (cleaned.includes('sslmode=disable')) {
      cleaned = cleaned.replace(/sslmode=disable/g, 'sslmode=prefer');
    } else if (!cleaned.includes('sslmode=')) {
      // Add sslmode=prefer if missing
      const separator = cleaned.includes('?') ? '&' : '?';
      cleaned += `${separator}sslmode=prefer`;
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
        throw new Error(
          'MySQL datasource requires connectionUrl or host in config',
        );
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
    case 'duckdb': {
      const path = extractPath(config, ['path', 'database', 'connectionUrl']);
      if (!path) {
        throw new Error(
          'SQLite/DuckDB datasource requires path, database, or connectionUrl in config',
        );
      }
      return path;
    }

    default:
      throw new Error(
        `Unsupported provider for connection string extraction: ${providerId}`,
      );
  }
}
