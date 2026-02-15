import {
  datasources,
  ExtensionsRegistry,
  type DriverFactory,
  type DriverContext,
  DriverExtension,
  type DatasourceExtension,
  ExtensionScope,
} from '@qwery/extensions-sdk';

import {
  discoverExtensionsFromFolders,
  type ContributesDriver,
  resolveDriverEntryPath,
  resolveSchemaPath,
} from './discovery';

type DriverModule = {
  driverFactory?: unknown;
  default?: unknown;
  [key: string]: unknown;
};

type DriverImportFn = () => Promise<DriverModule>;

const driverImports = new Map<string, DriverImportFn>();
const extensionIdToPath = new Map<string, string>();

function initDriverImportsFromFolders(basePaths?: string[]): void {
  /* istanbul ignore if -- Node-only; unreachable in test env -- @preserve */
  if (typeof process === 'undefined' || !process.versions?.node) return;

  const discovered = discoverExtensionsFromFolders(basePaths);

  for (const { extDir, pkg, datasources: dsList, drivers } of discovered) {
    const pkgMain = (pkg as { main?: string }).main;

    for (const nodeDriver of drivers) {
      if (nodeDriver.runtime !== 'node') continue;
      const entryPath = resolveDriverEntryPath(
        extDir,
        nodeDriver.entry,
        pkgMain,
        pkg as { exports?: { '.'?: { bun?: string } } },
      );
      const importFn: DriverImportFn = () =>
        import(/* @vite-ignore */ entryPath);
      driverImports.set(nodeDriver.id, importFn);
    }

    for (const ds of dsList) {
      const driverIds = ds.drivers ?? [];
      const driverDescriptors = driverIds
        .map((id) => drivers.find((d) => d.id === id))
        .filter((d): d is ContributesDriver => d != null);

      /* istanbul ignore next -- loop iteration -- @preserve */
      extensionIdToPath.set(ds.id, extDir);
      const extension: DatasourceExtension = {
        id: ds.id,
        name: ds.name,
        icon: ds.icon ?? '',
        description: ds.description,
        scope: ExtensionScope.DATASOURCE,
        schema: null,
        docsUrl: ds.docsUrl ?? null,
        supportsPreview: ds.supportsPreview === true,
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
  }
}

initDriverImportsFromFolders();

/**
 * Register extensions discovered from the given folders.
 * Exported for testing; when called with paths, adds/overrides extensions from those paths.
 */
export function registerExtensionsFromFolders(basePaths?: string[]): void {
  initDriverImportsFromFolders(basePaths);
}

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

  const extPath = extensionIdToPath.get(extensionId);
  if (!extPath) return;

  try {
    const schemaUrl = resolveSchemaPath(extPath);
    const mod = await import(/* @vite-ignore */ schemaUrl);
    const schema = mod.schema ?? mod.default;
    if (schema != null) {
      ExtensionsRegistry.register({ ...extension, schema });
    }
  } catch {
    // No schema export or file not found; keep schema null
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
      const mod = await loadDriverModule(driver.id);
      const driverFactory = getDriverFactoryFromModule(mod);

      if (typeof driverFactory === 'function') {
        factory = driverFactory as DriverFactory;
        datasources.registerDriver(
          driver.id,
          factory,
          /* istanbul ignore next -- fallback when runtime unspecified -- @preserve */
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

  /* istanbul ignore if -- defensive, unreachable in normal flow -- @preserve */
  if (!factory) {
    throw new Error(`Driver ${driver.id} did not register a factory`);
  }

  const driverContext: DriverContext = {
    ...context,
    runtime: context.runtime ?? driver.runtime,
  };
  return factory(driverContext);
}
