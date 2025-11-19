export interface ParsedConnectionString {
  protocol: string;
  username?: string;
  password?: string;
  host?: string;
  port?: string;
  database?: string;
  searchParams: URLSearchParams;
  raw: string;
}

export function parseConnectionString(
  connection: string,
): ParsedConnectionString {
  try {
    const url = new URL(connection);

    return {
      protocol: url.protocol.replace(':', ''),
      username: url.username || undefined,
      password: url.password || undefined,
      host: url.hostname || undefined,
      port: url.port || undefined,
      database: url.pathname ? url.pathname.replace(/^\//, '') || undefined : undefined,
      searchParams: url.searchParams,
      raw: connection,
    };
  } catch (error) {
    throw new Error(`Invalid connection string: ${(error as Error).message}`);
  }
}

export function connectionDescription(parsed: ParsedConnectionString): string {
  if (!parsed.host) {
    return parsed.raw;
  }

  const db = parsed.database ? `/${parsed.database}` : '';
  return `${parsed.host}${db}`;
}

