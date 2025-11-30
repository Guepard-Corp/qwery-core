export interface TestConnectionOptions {
  dbPath: string;
}

export const testConnection = async (
  opts: TestConnectionOptions,
): Promise<boolean> => {
  const { DuckDBInstance } = await import('@duckdb/node-api');
  type DuckDBInstanceType = Awaited<ReturnType<typeof DuckDBInstance.create>>;
  type ConnectionType = Awaited<ReturnType<DuckDBInstanceType['connect']>>;

  let instance: DuckDBInstanceType | null = null;
  let conn: ConnectionType | null = null;

  try {
    instance = await DuckDBInstance.create(opts.dbPath);
    conn = await instance.connect();

    // Test the connection by running a simple query
    await conn.run('SELECT 1');
    return true;
  } catch {
    return false;
  } finally {
    if (conn) {
      conn.closeSync();
    }
    if (instance) {
      instance.closeSync();
    }
  }
};
