import { type DuckDBConnection, DuckDBInstance } from '@duckdb/node-api';
import type { Compute, QueryResult, QueryRows, QuerySchema } from '@qwery/domain';

/**
 * `DuckDBComputeWithConnection` exposes its raw DuckDB connection so that
 * extension drivers can `INSTALL`/`LOAD` DuckDB extensions and `CREATE VIEW`
 * via the SDK's `queryEngineConnection` field (ADR-pending).
 */
export interface DuckDBComputeWithConnection extends Compute {
  /** Raw DuckDB connection — used by extension drivers via the SDK. */
  getRawConnection(): Promise<DuckDBConnection>;
}

class DuckDBCompute implements DuckDBComputeWithConnection {
  private conn: DuckDBConnection | null = null;

  private async getConnection(): Promise<DuckDBConnection> {
    if (this.conn) return this.conn;
    const instance = await DuckDBInstance.create(':memory:');
    this.conn = await instance.connect();
    return this.conn;
  }

  async runSql(sql: string): Promise<QueryResult> {
    const c = await this.getConnection();
    const start = performance.now();
    const reader = await c.runAndReadAll(sql);
    const rows = reader.getRowObjectsJson() as QueryRows;
    const columns = reader.columnNames();
    const durationMs = Math.round(performance.now() - start);
    return { columns, rows, rowCount: rows.length, durationMs };
  }

  async describeSql(sql: string): Promise<QuerySchema> {
    const c = await this.getConnection();
    const prepared = await c.prepare(sql);
    const out: QuerySchema = { columns: [] };
    const count = prepared.columnCount;
    for (let i = 0; i < count; i++) {
      out.columns.push({ name: prepared.columnName(i), type: String(prepared.columnType(i)) });
    }
    prepared.destroySync();
    return out;
  }

  async getRawConnection(): Promise<DuckDBConnection> {
    return this.getConnection();
  }
}

export function createDuckDBCompute(): DuckDBComputeWithConnection {
  return new DuckDBCompute();
}
