import type { DuckDBComputeWithConnection } from '@qwery/adapter-compute-duckdb';
import type { Datasource, DatasourceMetadata, IDatasourceRepository, Logger, Telemetry } from '@qwery/domain';
import { datasources as driverRegistry } from '@qwery/extension-sdk';
import { trackDatasource } from './telemetry-actions';

export interface AttachedColumn {
  name: string;
  type: string;
}

export interface AttachedTable {
  schema: string;
  table: string;
  path: string;
  columns: AttachedColumn[];
}

export type AttachState =
  | { status: 'attached'; datasource: Datasource; tables: AttachedTable[] }
  | { status: 'error'; datasource: Datasource; error: string }
  | { status: 'detached'; datasource: Datasource };

/** Native driver-introspected schema for one datasource (or the error if it failed). */
export interface DatasourceSchemaResult {
  datasourceId: string;
  datasourceName: string;
  metadata?: DatasourceMetadata;
  error?: string;
}

export interface AttachedDatasourcesRegistry {
  list(): AttachState[];
  get(id: string): AttachState | undefined;
  attach(ds: Datasource): Promise<AttachState>;
  detach(ds: Datasource): Promise<void>;
  /** Run the driver's `testConnection()` without revealing any config. */
  test(ds: Datasource): Promise<{ ok: boolean; error?: string }>;
  /** Native `driver.metadata()` introspection for every currently-attached datasource. */
  schemas(): Promise<DatasourceSchemaResult[]>;
  subscribe(listener: (states: AttachState[]) => void): () => void;
}

interface MetadataColumn {
  column_name?: string;
  name?: string;
  column_type?: string;
  type?: string;
}

function normalizeColumns(raw: unknown): AttachedColumn[] {
  if (!raw || typeof raw !== 'object') return [];
  const maybeColumns = (raw as { columns?: unknown }).columns;
  if (!Array.isArray(maybeColumns)) return [];
  return maybeColumns.map((c) => {
    const col = c as MetadataColumn;
    return {
      name: String(col.column_name ?? col.name ?? ''),
      type: String(col.column_type ?? col.type ?? ''),
    };
  });
}

export function createAttachedDatasourcesRegistry(deps: {
  compute: DuckDBComputeWithConnection;
  datasourceRepo: IDatasourceRepository;
  logger: Logger;
  telemetry: Telemetry;
}): AttachedDatasourcesRegistry {
  const { compute, datasourceRepo, logger, telemetry } = deps;
  const states = new Map<string, AttachState>();
  const listeners = new Set<(states: AttachState[]) => void>();

  function snapshot(): AttachState[] {
    return Array.from(states.values());
  }

  function notify(): void {
    const s = snapshot();
    for (const l of listeners) l(s);
  }

  async function attach(ds: Datasource): Promise<AttachState> {
    const reg = driverRegistry.getDriverRegistration(ds.datasource_driver);
    if (!reg) {
      const state: AttachState = {
        status: 'error',
        datasource: ds,
        error: `Driver "${ds.datasource_driver}" is not registered`,
      };
      states.set(ds.id, state);
      notify();
      logger.warn('datasource.attach.no-driver', { id: ds.id, driver: ds.datasource_driver });
      trackDatasource(telemetry, 'attach', ds.datasource_driver, false);
      return state;
    }
    try {
      const config = await datasourceRepo.revealSecrets(ds.config as Record<string, unknown>);
      const queryEngineConnection = await compute.getRawConnection();
      const driver = reg.factory({
        config,
        queryEngineConnection,
        logger: {
          debug: (...args: unknown[]) => logger.debug('driver', { args }),
          info: (...args: unknown[]) => logger.info('driver', { args }),
          warn: (...args: unknown[]) => logger.warn('driver', { args }),
          error: (...args: unknown[]) => logger.error('driver', { args }),
        },
      });
      await driver.testConnection();
      const attachResult = driver.attach
        ? await driver.attach({
            schemaName: 'main',
            sessionId: ds.id,
            datasourceId: ds.id,
            datasourceSlug: ds.slug,
          })
        : { tables: [] };
      const tables: AttachedTable[] = [];
      for (const t of attachResult.tables) {
        // `DESCRIBE SELECT * FROM <path>` works for 2-part (`main.view`) and
        // 3-part (`catalog.schema.table`) qualified identifiers — drivers that
        // ATTACH a remote catalog return 3-part paths.
        const reader = await queryEngineConnection.runAndReadAll(`DESCRIBE SELECT * FROM ${t.path}`);
        await reader.readAll();
        const columns = normalizeColumns({ columns: reader.getRowObjectsJS() });
        tables.push({ ...t, columns });
      }
      const state: AttachState = { status: 'attached', datasource: ds, tables };
      states.set(ds.id, state);
      notify();
      logger.info('datasource.attach.ok', {
        id: ds.id,
        driver: ds.datasource_driver,
        tableCount: tables.length,
      });
      trackDatasource(telemetry, 'attach', ds.datasource_driver, true);
      return state;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const state: AttachState = { status: 'error', datasource: ds, error: message };
      states.set(ds.id, state);
      notify();
      logger.error('datasource.attach.error', { id: ds.id, message });
      trackDatasource(telemetry, 'attach', ds.datasource_driver, false);
      return state;
    }
  }

  async function detach(ds: Datasource): Promise<void> {
    const reg = driverRegistry.getDriverRegistration(ds.datasource_driver);
    const current = states.get(ds.id);
    try {
      if (reg) {
        const config = await datasourceRepo.revealSecrets(ds.config as Record<string, unknown>);
        const queryEngineConnection = await compute.getRawConnection();
        const driver = reg.factory({ config, queryEngineConnection });
        if (driver.detach) {
          const tableNames = current?.status === 'attached' ? current.tables.map((t) => t.table) : undefined;
          await driver.detach({
            schemaName: 'main',
            tableNames,
            datasourceId: ds.id,
            datasourceSlug: ds.slug,
          });
        }
      }
    } catch (err) {
      logger.error('datasource.detach.error', {
        id: ds.id,
        message: err instanceof Error ? err.message : String(err),
      });
    }
    states.set(ds.id, { status: 'detached', datasource: ds });
    notify();
    trackDatasource(telemetry, 'detach', ds.datasource_driver, true);
  }

  async function test(ds: Datasource): Promise<{ ok: boolean; error?: string }> {
    const reg = driverRegistry.getDriverRegistration(ds.datasource_driver);
    if (!reg) {
      trackDatasource(telemetry, 'test', ds.datasource_driver, false);
      return { ok: false, error: `Driver "${ds.datasource_driver}" is not registered` };
    }
    try {
      const config = await datasourceRepo.revealSecrets(ds.config as Record<string, unknown>);
      const queryEngineConnection = await compute.getRawConnection();
      const driver = reg.factory({ config, queryEngineConnection });
      await driver.testConnection();
      trackDatasource(telemetry, 'test', ds.datasource_driver, true);
      return { ok: true };
    } catch (err) {
      trackDatasource(telemetry, 'test', ds.datasource_driver, false);
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  // Ask the driver to introspect itself natively, far richer and safer than
  // guessing a table name and running `SELECT *` (ADR #28). DuckDB-federated
  // drivers (csv, postgres) read information_schema / DESCRIBE through the shared
  // queryEngineConnection; native-only sources DuckDB can't speak (e.g.
  // ClickHouse) ignore it and use their own client from `config`. We always
  // `close()` afterwards so native clients release their connection — the
  // federated drivers' `close()` is a no-op and never touches the shared DuckDB
  // connection (which `compute` owns, not the driver).
  async function introspect(ds: Datasource): Promise<DatasourceMetadata> {
    const reg = driverRegistry.getDriverRegistration(ds.datasource_driver);
    if (!reg) throw new Error(`Driver "${ds.datasource_driver}" is not registered`);
    const config = await datasourceRepo.revealSecrets(ds.config as Record<string, unknown>);
    const queryEngineConnection = await compute.getRawConnection();
    const driver = reg.factory({ config, queryEngineConnection });
    try {
      return await driver.metadata();
    } finally {
      await driver.close?.();
    }
  }

  async function schemas(): Promise<DatasourceSchemaResult[]> {
    const attached = snapshot().filter(
      (s): s is AttachState & { status: 'attached' } => s.status === 'attached',
    );
    return Promise.all(
      attached.map(async ({ datasource }) => {
        try {
          const metadata = await introspect(datasource);
          return { datasourceId: datasource.id, datasourceName: datasource.name, metadata };
        } catch (err) {
          const error = err instanceof Error ? err.message : String(err);
          logger.warn('datasource.schema.error', { id: datasource.id, error });
          return { datasourceId: datasource.id, datasourceName: datasource.name, error };
        }
      }),
    );
  }

  return {
    list: snapshot,
    get: (id) => states.get(id),
    attach,
    detach,
    test,
    schemas,
    subscribe(listener) {
      listeners.add(listener);
      listener(snapshot());
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
