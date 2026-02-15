/**
 * Load a browser driver from URL. Used by getDriverInstance when runtime is 'browser'.
 * Excluded from coverage - tested in e2e.
 */
export async function loadBrowserDriver(
  driverId: string,
  entry: string | undefined,
): Promise<{
  driverFactory?: unknown;
  default?: unknown;
  [key: string]: unknown;
}> {
  const resolvedEntry = entry ?? './dist/driver.js';
  const fileName = resolvedEntry.split(/[/\\]/).pop() || 'driver.js';
  const g = globalThis as unknown as {
    window?: { location: { origin: string } };
  };
  const origin = g.window?.location?.origin ?? '';
  const url = `${origin}/extensions/${driverId}/${fileName}`;
  const dynamicImport = new Function('url', 'return import(url)');
  return dynamicImport(url);
}
