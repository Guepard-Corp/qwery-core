import type {
  DriverContext,
  DriverExtension,
  IDataSourceDriver,
} from '@qwery/extensions-sdk';

type DriverModule = {
  driverFactory?: unknown;
  default?: unknown;
  [key: string]: unknown;
};

function getDriverFactoryFromModule(
  mod: DriverModule,
): ((ctx: DriverContext) => IDataSourceDriver) | undefined {
  const m = mod as Record<string, unknown>;
  const factory = m.driverFactory ?? m.default;
  return typeof factory === 'function'
    ? (factory as (ctx: DriverContext) => IDataSourceDriver)
    : undefined;
}

/** Path prefix for browser drivers (files live under public/extensions/) */
const EXTENSIONS_BASE = '/extensions';

function getDriverScriptUrl(
  driver: Pick<DriverExtension, 'id' | 'entry'>,
): string {
  const entry = driver.entry ?? './dist/driver.js';
  const fileName = entry.split(/[/\\]/).pop() ?? 'driver.js';
  const path = `${EXTENSIONS_BASE}/${driver.id}/${fileName}`;
  if (typeof window !== 'undefined') {
    return new URL(path, window.location.origin).href;
  }
  return path;
}

const loadedModules = new Map<string, DriverModule>();

/**
 * Load a browser driver from public/extensions/{driverId}/{driver.js}.
 * JS files are served at /extensions/{driverId}/.
 */
export async function getBrowserDriverInstance(
  driver: Pick<DriverExtension, 'id' | 'entry'>,
  context: DriverContext,
): Promise<IDataSourceDriver> {
  let mod = loadedModules.get(driver.id);

  if (!mod) {
    const url = getDriverScriptUrl(driver);
    const dynamicImport = new Function('url', 'return import(url)');
    mod = (await dynamicImport(url)) as DriverModule;
    loadedModules.set(driver.id, mod);
  }

  const factory = getDriverFactoryFromModule(mod);
  if (!factory) {
    throw new Error(
      `Driver ${driver.id} did not export a driverFactory or default function`,
    );
  }

  const driverContext: DriverContext = {
    ...context,
    runtime: context.runtime ?? 'browser',
  };
  return factory(driverContext);
}
