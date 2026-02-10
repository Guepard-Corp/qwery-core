import { createRequire } from 'node:module';

import {
  datasources,
  ExtensionsRegistry,
  type DriverFactory,
  type DriverContext,
  DriverExtension,
  type DatasourceExtension,
  ExtensionScope,
} from '@qwery/extensions-sdk';

type DriverModule = {
  driverFactory?: unknown;
  default?: unknown;
  [key: string]: unknown;
};

type DriverImportFn = () => Promise<DriverModule>;

const driverImports = new Map<string, DriverImportFn>();
const extensionIdToPkgName = new Map<string, string>();

const EXTENSIONS = [
  '@qwery/extension-clickhouse-node',
  '@qwery/extension-duckdb',
  '@qwery/extension-gsheet-csv',
  '@qwery/extension-json-online',
  '@qwery/extension-mysql',
  '@qwery/extension-parquet-online',
  '@qwery/extension-s3',
  '@qwery/extension-postgresql',
  '@qwery/extension-youtube-data-api-v3',
  '@qwery/extension-clickhouse-web',
  '@qwery/extension-duckdb-wasm',
  '@qwery/extension-pglite',
  '@qwery/extension-postgresql-supabase',
  '@qwery/extension-postgresql-neon',
];

interface ContributesDriver {
  id: string;
  name: string;
  description?: string;
  runtime?: string;
  entry?: string;
}

interface ContributesDatasource {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  schema: unknown;
  formConfig?: unknown;
  drivers?: string[];
}

interface PackageContributes {
  drivers?: ContributesDriver[];
  datasources?: ContributesDatasource[];
}

function initDriverImportsFromPackageJson(): void {
  if (typeof process === 'undefined' || !process.versions?.node) return;
  const requireFromLoader = createRequire(import.meta.url);
  const fs = requireFromLoader('node:fs') as typeof import('node:fs');
  const path = requireFromLoader('node:path') as typeof import('node:path');

  for (const pkgName of EXTENSIONS) {
    try {
      const entryPath = requireFromLoader.resolve(pkgName);
      let dir = path.dirname(entryPath);
      while (dir !== path.dirname(dir)) {
        if (fs.existsSync(path.join(dir, 'package.json'))) break;
        dir = path.dirname(dir);
      }
      const pkg = JSON.parse(
        fs.readFileSync(path.join(dir, 'package.json'), 'utf8'),
      ) as { contributes?: PackageContributes };
      const contributes = pkg.contributes ?? {};
      const drivers = contributes.drivers ?? [];
      const datasources = contributes.datasources ?? [];

      const importFn: DriverImportFn = () => import(/* @vite-ignore */ pkgName);
      for (const driver of drivers) {
        driverImports.set(driver.id, importFn);
      }

      for (const ds of datasources) {
        const driverIds = ds.drivers ?? [];
        const driverDescriptors = driverIds
          .map((id) => drivers.find((d) => d.id === id))
          .filter((d): d is ContributesDriver => d != null);
        extensionIdToPkgName.set(ds.id, pkgName);
        const extension: DatasourceExtension = {
          id: ds.id,
          name: ds.name,
          icon: ds.icon ?? '',
          description: ds.description,
          scope: ExtensionScope.DATASOURCE,
          schema: null,
          formConfig: ds.formConfig,
          drivers: driverDescriptors.map((d) => ({
            id: d.id,
            name: d.name,
            description: d.description,
            runtime: d.runtime as DatasourceExtension['drivers'][0]['runtime'],
            entry: d.entry,
          })),
        };
        ExtensionsRegistry.register(extension);
      }
    } catch {
      // skip if package not found or not built
    }
  }
}

initDriverImportsFromPackageJson();

/**
 * Load the Zod schema from the extension package for server-side use (e.g. getSecretFields).
 * Idempotent: if the extension already has a schema, does nothing.
 */
export async function loadExtensionSchemaForProvider(
  extensionId: string,
): Promise<void> {
  const extension = ExtensionsRegistry.get(extensionId) as
    | DatasourceExtension
    | undefined;
  if (!extension || extension.schema != null) return;

  const pkgName = extensionIdToPkgName.get(extensionId);
  if (!pkgName) return;

  try {
    const mod = await import(/* @vite-ignore */ `${pkgName}/schema`);
    const schema = mod.schema ?? mod.default;
    if (schema != null) {
      ExtensionsRegistry.register({ ...extension, schema });
    }
  } catch {
    // No schema export or package not built; keep schema null
  }
}

function getDriverFactoryFromModule(mod: DriverModule): unknown {
  const m = mod as Record<string, unknown>;
  const factory = m.driverFactory ?? m.default;
  return typeof factory === 'function' ? factory : undefined;
}

const loadedDrivers = new Set<string>();

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
 * Get a driver instance from the registry.
 * Loads and registers the driver if not already loaded.
 */
export async function getDriverInstance(
  driver: DriverExtension,
  context: DriverContext,
): Promise<ReturnType<DriverFactory>> {
  let factory = datasources.getDriverRegistration(driver.id)?.factory;
  if (factory) {
    const driverContext: DriverContext = {
      ...context,
      runtime: context.runtime ?? driver.runtime,
    };
    return factory(driverContext);
  }

  if (!loadedDrivers.has(driver.id)) {
    loadedDrivers.add(driver.id);
    try {
      let mod: DriverModule;

      if (driver.runtime === 'node') {
        mod = await loadDriverModule(driver.id);
      } else {
        const entry = driver.entry ?? './dist/driver.js';
        const fileName = entry.split(/[/\\]/).pop() || 'driver.js';
        const g = globalThis as unknown as {
          window?: { location: { origin: string } };
        };
        const origin = g.window?.location?.origin ?? '';
        const url = `${origin}/extensions/${driver.id}/${fileName}`;
        const dynamicImport = new Function('url', 'return import(url)');
        mod = await dynamicImport(url);
      }

      const driverFactory = getDriverFactoryFromModule(mod);

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
    } catch (err) {
      loadedDrivers.delete(driver.id);
      throw err;
    }
  }

  if (!factory) {
    throw new Error(`Driver ${driver.id} did not register a factory`);
  }

  const driverContext: DriverContext = {
    ...context,
    runtime: context.runtime ?? driver.runtime,
  };
  return factory(driverContext);
}
