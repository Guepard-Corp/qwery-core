/**
 * Parses a connection string/URL and extracts connection parameters
 * Supports: postgresql://, mysql://, clickhouse://, http://, https://
 */

export interface ParsedConnectionString {
  host?: string;
  port?: string;
  database?: string;
  username?: string;
  password?: string;
  ssl?: boolean;
}

export function parseConnectionString(
  connectionString: string,
  _extensionId: string,
): ParsedConnectionString | null {
  if (!connectionString || typeof connectionString !== 'string') {
    return null;
  }

  const trimmed = connectionString.trim();
  if (!trimmed) {
    return null;
  }

  try {
    // PostgreSQL: postgresql://user:pass@host:port/db?sslmode=require
    if (
      trimmed.startsWith('postgresql://') ||
      trimmed.startsWith('postgres://')
    ) {
      const url = new URL(trimmed);
      const result: ParsedConnectionString = {
        host: url.hostname || undefined,
        port: url.port || undefined,
        database: url.pathname.slice(1) || undefined,
        username: url.username || undefined,
        password: url.password || undefined,
      };

      const sslMode = url.searchParams.get('sslmode');
      if (
        sslMode === 'require' ||
        sslMode === 'prefer' ||
        sslMode === 'verify-ca' ||
        sslMode === 'verify-full'
      ) {
        result.ssl = true;
      }

      return result;
    }

    // MySQL: mysql://user:pass@host:port/db
    if (trimmed.startsWith('mysql://')) {
      const url = new URL(trimmed);
      return {
        host: url.hostname || undefined,
        port: url.port || undefined,
        database: url.pathname.slice(1) || undefined,
        username: url.username || undefined,
        password: url.password || undefined,
      };
    }

    // ClickHouse: clickhouse://user:pass@host:port/db or http://host:port
    if (trimmed.startsWith('clickhouse://')) {
      const url = new URL(trimmed);
      return {
        host: url.hostname || undefined,
        port: url.port || undefined,
        database: url.pathname.slice(1) || undefined,
        username: url.username || undefined,
        password: url.password || undefined,
      };
    }

    // HTTP/HTTPS URLs (for ClickHouse HTTP interface)
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const url = new URL(trimmed);
      const result: ParsedConnectionString = {
        host: url.hostname || undefined,
        port: url.port || undefined,
      };

      if (url.pathname && url.pathname !== '/') {
        result.database = url.pathname.slice(1) || undefined;
      }

      if (url.username) {
        result.username = url.username;
      }
      if (url.password) {
        result.password = url.password;
      }

      if (trimmed.startsWith('https://')) {
        result.ssl = true;
      }

      return result;
    }

    // Try to parse as generic URL
    try {
      const url = new URL(trimmed);
      return {
        host: url.hostname || undefined,
        port: url.port || undefined,
        database: url.pathname.slice(1) || undefined,
        username: url.username || undefined,
        password: url.password || undefined,
      };
    } catch {
      // Not a valid URL format
    }
  } catch {
    // Parsing failed
  }

  return null;
}
