import * as duckdb from '@duckdb/duckdb-wasm';
import type { DatasourceResultSet } from '@qwery/domain/entities';
import { getLogger } from '@qwery/shared/logger';
import { escapeSqlStringLiteral } from '@qwery/shared/sql-string-literal';
import { driverCommand } from '~/lib/repositories/api-client';

let db: duckdb.AsyncDuckDB | null = null;

async function getDuckDB() {
  if (db) return db;

  const MANUAL_BUNDLES: duckdb.DuckDBBundles = {
    mvp: {
      mainModule: '/extensions/duckdb-wasm.default/duckdb-mvp.wasm',
      mainWorker:
        '/extensions/duckdb-wasm.default/duckdb-browser-mvp.worker.js',
    },
    eh: {
      mainModule: '/extensions/duckdb-wasm.default/duckdb-eh.wasm',
      mainWorker: '/extensions/duckdb-wasm.default/duckdb-browser-eh.worker.js',
    },
  };

  const bundle = await duckdb.selectBundle(MANUAL_BUNDLES);

  const worker = new Worker(bundle.mainWorker!);
  const logger = new duckdb.VoidLogger();
  const nextDb = new duckdb.AsyncDuckDB(logger, worker);
  try {
    await nextDb.instantiate(bundle.mainModule, bundle.pthreadWorker);
  } catch (err) {
    worker.terminate();
    throw err;
  }
  db = nextDb;

  return db;
}

export const DATA_PREVIEW_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  INITIAL_LIMIT: 100, // Fetch 100 rows for preview
  ITEMS_PER_PAGE: 20, // Show 20 rows per page (5 pages total)
  TIMEOUT_MS: 15_000, // Hard timeout for preview fetch
} as const;

export interface DataFetchResult {
  data: Record<string, unknown>[] | null;
  error: string | null;
}

/**
 * Fetches preview rows from the server (bypassing CORS)
 */
async function fetchDataFromServer(
  url: string,
  limit: number,
  format: 'parquet' | 'csv',
): Promise<DataFetchResult> {
  try {
    const datasourceProvider =
      format === 'parquet' ? 'parquet-online' : 'csv-online';
    const driverId =
      format === 'parquet' ? 'parquet-online.duckdb' : 'csv-online.duckdb';
    const safePath = escapeSqlStringLiteral(url);

    const result = await driverCommand<DatasourceResultSet>('query', {
      datasourceProvider,
      driverId,
      config: { url },
      sql:
        format === 'parquet'
          ? `SELECT * FROM read_parquet('${safePath}') LIMIT ${limit}`
          : `SELECT * FROM read_csv_auto('${safePath}') LIMIT ${limit}`,
    });

    return { data: result.rows ?? null, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Server proxy failed',
    };
  }
}

/**
 * Generic data fetcher using DuckDB-Wasm with Server Fallback + timeout
 */
async function fetchData(
  url: string,
  format: 'parquet' | 'csv',
  limit: number = DATA_PREVIEW_CONFIG.INITIAL_LIMIT,
): Promise<DataFetchResult> {
  const fileName = `remote_${Math.random().toString(36).substring(7)}.${format}`;

  const coreFetch = async (): Promise<DataFetchResult> => {
    try {
      // Try to check file size via HEAD request if possible
      try {
        const headResponse = await fetch(url, { method: 'HEAD' });
        const contentLength = headResponse.headers.get('content-length');
        if (
          contentLength &&
          parseInt(contentLength, 10) > DATA_PREVIEW_CONFIG.MAX_FILE_SIZE
        ) {
          return {
            data: null,
            error: `File too large (${Math.round(parseInt(contentLength, 10) / 1024 / 1024)}MB). Preview limit is ${DATA_PREVIEW_CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB.`,
          };
        }
      } catch (e) {
        void getLogger().then((logger) =>
          logger.warn(
            { err: e },
            'Data preview HEAD size check failed, continuing',
          ),
        );
      }

      const duckDB = await getDuckDB();
      await duckDB.registerFileURL(
        fileName,
        url,
        duckdb.DuckDBDataProtocol.HTTP,
        false,
      );
      const conn = await duckDB.connect();

      try {
        const safeFile = escapeSqlStringLiteral(fileName);
        const query =
          format === 'parquet'
            ? `SELECT * FROM read_parquet('${safeFile}') LIMIT ${limit}`
            : `SELECT * FROM read_csv_auto('${safeFile}') LIMIT ${limit}`;

        const result = await conn.query(query);

        const rows = result.toArray().map((row) => {
          const obj: Record<string, unknown> = {};
          for (const key of Object.keys(row)) {
            let val = row[key];
            if (typeof val === 'bigint') {
              val = val.toString();
            }
            obj[key] = val;
          }
          return obj;
        });

        return { data: rows, error: null };
      } catch (queryError: unknown) {
        void getLogger().then((logger) =>
          logger.warn(
            { err: queryError, format },
            'DuckDB browser query failed',
          ),
        );
        const errorMessage =
          queryError instanceof Error ? queryError.message : '';
        if (
          errorMessage.includes('XMLHttpRequest') ||
          errorMessage.includes('NetworkError') ||
          errorMessage.includes('CORS')
        ) {
          return fetchDataFromServer(url, limit, format);
        }
        return {
          data: null,
          error:
            queryError instanceof Error
              ? queryError.message
              : `Failed to query ${format} file`,
        };
      } finally {
        await conn.close();
        try {
          await duckDB.dropFile(fileName);
        } catch {
          // Ignore drop errors
        }
      }
    } catch (error) {
      void getLogger().then((logger) =>
        logger.warn(
          { err: error, format },
          'DuckDB initialization failed, trying server fallback',
        ),
      );
      return fetchDataFromServer(url, limit, format);
    }
  };

  const timeoutPromise = new Promise<DataFetchResult>((resolve) => {
    setTimeout(() => {
      resolve({
        data: null,
        error: 'Preview timed out. Try again or reduce file size.',
      });
    }, DATA_PREVIEW_CONFIG.TIMEOUT_MS);
  });

  return Promise.race([coreFetch(), timeoutPromise]);
}

export const fetchParquetData = (
  url: string,
  limit: number = DATA_PREVIEW_CONFIG.INITIAL_LIMIT,
) => fetchData(url, 'parquet', limit);
export const fetchCsvData = (
  url: string,
  limit: number = DATA_PREVIEW_CONFIG.INITIAL_LIMIT,
) => fetchData(url, 'csv', limit);
