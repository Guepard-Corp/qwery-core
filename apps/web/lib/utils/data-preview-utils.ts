import * as duckdb from '@duckdb/duckdb-wasm';
import type { DatasourceResultSet } from '@qwery/domain/entities';
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
  db = new duckdb.AsyncDuckDB(logger, worker);
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);

  return db;
}

export const DATA_PREVIEW_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  INITIAL_LIMIT: 100, // Fetch 100 rows for preview
  ITEMS_PER_PAGE: 20, // Show 20 rows per page (5 pages total)
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
      format === 'parquet' ? 'parquet-online' : 'gsheet-csv';
    const driverId =
      format === 'parquet' ? 'parquet-online.duckdb' : 'gsheet-csv.csv';

    const result = await driverCommand<DatasourceResultSet>('query', {
      datasourceProvider,
      driverId,
      config: { url },
      sql:
        format === 'parquet'
          ? `SELECT * FROM read_parquet('${url}') LIMIT ${limit}`
          : `SELECT * FROM read_csv_auto('${url}') LIMIT ${limit}`,
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
 * Generic data fetcher using DuckDB-Wasm with Server Fallback
 */
async function fetchData(
  url: string,
  format: 'parquet' | 'csv',
  limit: number = DATA_PREVIEW_CONFIG.INITIAL_LIMIT,
): Promise<DataFetchResult> {
  const fileName = `remote_${Math.random().toString(36).substring(7)}.${format}`;

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
      // HEAD might fail (CORS), we continue and let DuckDB handle it
      console.warn('File size check failed, continuing...', e);
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
      const query =
        format === 'parquet'
          ? `SELECT * FROM read_parquet('${fileName}') LIMIT ${limit}`
          : `SELECT * FROM read_csv_auto('${fileName}') LIMIT ${limit}`;

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
      console.error(`DuckDB Browser ${format} Error:`, queryError);
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
    console.warn(
      `DuckDB initialization failed for ${format}, trying server fallback...`,
      error,
    );
    return fetchDataFromServer(url, limit, format);
  }
}

export const fetchParquetData = (
  url: string,
  limit: number = DATA_PREVIEW_CONFIG.INITIAL_LIMIT,
) => fetchData(url, 'parquet', limit);
export const fetchCsvData = (
  url: string,
  limit: number = DATA_PREVIEW_CONFIG.INITIAL_LIMIT,
) => fetchData(url, 'csv', limit);
