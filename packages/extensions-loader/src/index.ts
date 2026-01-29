import {
  datasources,
  type DriverFactory,
  type DriverContext,
  getDiscoveredDatasource,
  getDiscoveredDatasources,
  type DiscoveredDriver,
  type DatasourceExtension,
  type ExtensionMetadata,
  ExtensionScope,
} from '@qwery/extensions-sdk';

type DriverModule = {
  driverFactory?: unknown;
  default?: unknown;
  [key: string]: unknown;
};

type DriverImportFn = () => Promise<DriverModule>;

const loadedDrivers = new Set<string>();

/**
 * Manual map of driver IDs to their import functions.
 * Add new node drivers here when creating new extensions.
 */
const driverImports = new Map<string, DriverImportFn>([
  // ClickHouse Node
  [
    'clickhouse.node',
    () => import('@qwery/extension-clickhouse-node') as Promise<DriverModule>,
  ],

  // DuckDB Node
  [
    'duckdb.default',
    () => import('@qwery/extension-duckdb') as Promise<DriverModule>,
  ],

  // Google Sheets CSV
  [
    'gsheet-csv.duckdb',
    () => import('@qwery/extension-gsheet-csv') as Promise<DriverModule>,
  ],

  // JSON Online
  [
    'json-online.duckdb',
    () => import('@qwery/extension-json-online') as Promise<DriverModule>,
  ],

  // MySQL
  [
    'mysql.default',
    () => import('@qwery/extension-mysql') as Promise<DriverModule>,
  ],

  // Parquet Online
  [
    'parquet-online.duckdb',
    () => import('@qwery/extension-parquet-online') as Promise<DriverModule>,
  ],

  // PostgreSQL (used by postgresql, postgresql-supabase, postgresql-neon)
  [
    'postgresql.default',
    () => import('@qwery/extension-postgresql') as Promise<DriverModule>,
  ],

  // YouTube Data API v3
  [
    'youtube-data-api-v3.default',
    () =>
      import('@qwery/extension-youtube-data-api-v3') as Promise<DriverModule>,
  ],
]);

/**
 * Load a node driver module by driver ID
 * @param driverId The driver ID (e.g., 'gsheet-csv.duckdb')
 * @returns The loaded driver module
 */
async function loadDriverModule(driverId: string): Promise<DriverModule> {
  const importFn = driverImports.get(driverId);
  if (!importFn) {
    throw new Error(
      `Driver ${driverId} not found. Available drivers: ${Array.from(driverImports.keys()).join(', ')}`,
    );
  }

  try {
    return await importFn();
  } catch (error) {
    throw new Error(
      `Failed to load driver module for ${driverId}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Get all registered node driver IDs
 */
export function getNodeDriverIds(): string[] {
  return Array.from(driverImports.keys());
}

/**
 * Get a driver instance from the registry
 * Loads and registers the driver if not already loaded
 * @param driver The discovered driver metadata
 * @param context Optional driver context to merge with default context
 */
export async function getDriverInstance(
  driver: DiscoveredDriver,
  context?: Partial<DriverContext>,
): Promise<ReturnType<DriverFactory>> {
  // Get factory from registry
  let factory = datasources.getDriverRegistration(driver.id)?.factory;
  if (factory) {
    const driverContext: DriverContext = {
      runtime: driver.runtime,
      ...context,
    };
    return factory(driverContext);
  }

  // Load and register if not already loaded
  if (!loadedDrivers.has(driver.id)) {
    loadedDrivers.add(driver.id);

    let mod: DriverModule;

    // Load the module based on runtime
    if (driver.runtime === 'node') {
      mod = await loadDriverModule(driver.id);
    } else {
      // Browser driver - load from public directory
      const entry = driver.entry ?? './dist/driver.js';
      const fileName = entry.split(/[/\\]/).pop() || 'driver.js';
      const url = `${window.location.origin}/extensions/${driver.id}/${fileName}`;
      const dynamicImport = new Function('url', 'return import(url)');
      mod = await dynamicImport(url);
    }

    // Get driver factory directly from module
    const driverFactory =
      (mod as Record<string, unknown>).driverFactory ??
      (mod as Record<string, unknown>).default;

    if (typeof driverFactory === 'function') {
      factory = driverFactory as DriverFactory;
      datasources.registerDriver(driver.id, factory, driver.runtime ?? 'node');
    } else {
      throw new Error(
        `Driver ${driver.id} did not export a driverFactory or default function`,
      );
    }
  }

  if (!factory) {
    throw new Error(`Driver ${driver.id} did not register a factory`);
  }

  const driverContext: DriverContext = {
    runtime: driver.runtime,
    ...context,
  };
  return factory(driverContext);
}

// Extension registry functions

function pickDriver(drivers: DiscoveredDriver[], config: unknown) {
  const cfg = config as { driverId?: string } | undefined;
  if (cfg?.driverId) {
    const match = drivers.find((d) => d.id === cfg.driverId);
    if (match) return match;
  }

  const browserPreferred =
    typeof window !== 'undefined' &&
    drivers.find((d) => d.runtime === 'browser');
  if (browserPreferred) return browserPreferred;

  return drivers[0];
}

function normalizeIconPath(
  icon: string | undefined,
  datasourceId: string,
): string {
  if (!icon) return '';
  // If already an absolute path (starts with /), return as is
  if (icon.startsWith('/')) return icon;
  // If relative path, convert to public path
  const filename = icon.split('/').pop() || icon;
  return `/extensions/${datasourceId}/${filename}`;
}

/**
 * Get an extension by ID
 */
export async function getExtension(
  id: string,
): Promise<DatasourceExtension | undefined> {
  const ds = await getDiscoveredDatasource(id);
  if (!ds) return undefined;

  const drivers = ds.drivers;

  return {
    id: ds.id,
    name: ds.name,
    logo: normalizeIconPath(ds.icon, ds.id),
    description: ds.description,
    tags: [],
    scope: ds.scope,
    schema: ds.schema,
    getDriver: async (instanceName: string, config: unknown) => {
      const driver = pickDriver(drivers, config);
      if (!driver) {
        throw new Error(`No driver configured for datasource ${ds.id}`);
      }

      // Get factory from registry
      let factory = datasources.getDriverRegistration(driver.id)?.factory;
      if (factory) {
        const context: DriverContext = { runtime: driver.runtime };
        return factory(context);
      }

      // Load and register if not already loaded
      if (!loadedDrivers.has(driver.id)) {
        loadedDrivers.add(driver.id);

        let mod: DriverModule;

        // Load the module based on runtime
        if (driver.runtime === 'node') {
          mod = await loadDriverModule(driver.id);
        } else {
          // Browser driver - load from public directory
          const entry = driver.entry ?? './dist/driver.js';
          const fileName = entry.split(/[/\\]/).pop() || 'driver.js';
          const url = `${window.location.origin}/extensions/${driver.id}/${fileName}`;
          const dynamicImport = new Function('url', 'return import(url)');
          mod = await dynamicImport(url);
        }

        // Get driver factory directly from module
        const driverFactory =
          (mod as Record<string, unknown>).driverFactory ??
          (mod as Record<string, unknown>).default;

        if (typeof driverFactory === 'function') {
          factory = driverFactory as DriverFactory;
          datasources.registerDriver(
            driver.id,
            factory,
            driver.runtime ?? 'node',
          );
        } else {
          throw new Error(
            `Driver ${driver.id} did not export a driverFactory or default function`,
          );
        }
      }

      if (!factory) {
        throw new Error(`Driver ${driver.id} did not register a factory`);
      }

      const context: DriverContext = { runtime: driver.runtime };
      return factory(context);
    },
  };
}

/**
 * Get all extensions
 */
export async function getAllExtensions(): Promise<DatasourceExtension[]> {
  const datasources = await getDiscoveredDatasources();
  const extensions = await Promise.all(
    datasources.map((ds) => getExtension(ds.id)),
  );
  return extensions.filter(Boolean) as DatasourceExtension[];
}

/**
 * Get extension metadata by ID
 */
export async function getExtensionMetadata(
  id: string,
): Promise<ExtensionMetadata | undefined> {
  const ds = await getDiscoveredDatasource(id);
  if (!ds) return undefined;
  return {
    id: ds.id,
    name: ds.name,
    logo: normalizeIconPath(ds.icon, ds.id),
    description: ds.description,
    tags: [],
    scope: ds.scope ?? ExtensionScope.DATASOURCE,
    schema: ds.schema,
  };
}

/**
 * Get all extension metadata
 */
export async function getAllExtensionMetadata(): Promise<ExtensionMetadata[]> {
  const datasources = await getDiscoveredDatasources();
  return datasources.map((ds) => ({
    id: ds.id,
    name: ds.name,
    logo: normalizeIconPath(ds.icon, ds.id),
    description: ds.description,
    tags: [],
    scope: ds.scope ?? ExtensionScope.DATASOURCE,
    schema: ds.schema,
  }));
}

// Re-export types for convenience
export type {
  DatasourceExtension,
  ExtensionMetadata,
  DiscoveredDriver,
} from '@qwery/extensions-sdk';
