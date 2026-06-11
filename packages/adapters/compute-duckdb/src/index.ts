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

export interface DuckDBComputeOptions {
  /**
   * Per-query wall-clock budget in milliseconds. When a query exceeds it, the
   * running statement is cancelled via `connection.interrupt()` and the call
   * rejects instead of hanging forever. A query proxied to a remote engine
   * (e.g. PostgreSQL via the postgres extension) can otherwise stall
   * indefinitely on a dropped connection or a lock wait, deadlocking the whole
   * agent turn. Set to `0` to disable. Defaults to `QWERY_QUERY_TIMEOUT_MS`
   * or {@link DEFAULT_QUERY_TIMEOUT_MS}.
   */
  timeoutMs?: number;
}

/** Default per-query timeout: long enough for heavy audit scans, short enough to bound a hang. */
export const DEFAULT_QUERY_TIMEOUT_MS = 120_000;

function resolveTimeoutMs(explicit?: number): number {
  if (explicit !== undefined) return explicit;
  // Treat unset OR blank as "use the default" — `Number('') === 0` would
  // otherwise silently DISABLE the timeout (0 = disabled), defeating the
  // hang-protection this knob exists to provide.
  const raw = process.env.QWERY_QUERY_TIMEOUT_MS;
  if (raw === undefined || raw.trim() === '') return DEFAULT_QUERY_TIMEOUT_MS;
  const env = Number(raw);
  return Number.isFinite(env) && env >= 0 ? env : DEFAULT_QUERY_TIMEOUT_MS;
}

class DuckDBCompute implements DuckDBComputeWithConnection {
  private conn: DuckDBConnection | null = null;
  private readonly timeoutMs: number;

  constructor(options: DuckDBComputeOptions = {}) {
    this.timeoutMs = resolveTimeoutMs(options.timeoutMs);
  }

  private async getConnection(): Promise<DuckDBConnection> {
    if (this.conn) return this.conn;
    const instance = await DuckDBInstance.create(':memory:');
    this.conn = await instance.connect();
    return this.conn;
  }

  /**
   * Run `op` against the connection, cancelling the in-flight statement and
   * rejecting if it overruns {@link timeoutMs}. The underlying DuckDB promise
   * settles on its own after `interrupt()` (with a cancellation error); its
   * result is handled here so it never surfaces as an unhandled rejection.
   */
  private withTimeout<T>(c: DuckDBConnection, op: () => Promise<T>): Promise<T> {
    if (this.timeoutMs <= 0) return op();
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        // Cancel the running statement on the shared connection. Wrapped
        // defensively: interrupt throws if the connection is already closed.
        try {
          c.interrupt();
        } catch {
          // ignore — the query is already finishing or the connection is gone
        }
        reject(new Error(`Query exceeded ${this.timeoutMs}ms timeout and was cancelled.`));
      }, this.timeoutMs);
      op().then(
        (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        (err) => {
          clearTimeout(timer);
          reject(err);
        },
      );
    });
  }

  async runSql(sql: string): Promise<QueryResult> {
    const c = await this.getConnection();
    const start = performance.now();
    const reader = await this.withTimeout(c, () => c.runAndReadAll(sql));
    const rows = reader.getRowObjectsJson() as QueryRows;
    const columns = reader.columnNames();
    const durationMs = Math.round(performance.now() - start);
    return { columns, rows, rowCount: rows.length, durationMs };
  }

  async describeSql(sql: string): Promise<QuerySchema> {
    const c = await this.getConnection();
    const prepared = await this.withTimeout(c, () => c.prepare(sql));
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

export function createDuckDBCompute(options: DuckDBComputeOptions = {}): DuckDBComputeWithConnection {
  return new DuckDBCompute(options);
}
