/** Get parquet-online driver with attach support (uses queryEngineConnection). Exported for use by DatasourceAttachmentService. */
export async function getParquetDriverWithConnection(conn: unknown): Promise<{
  attach: (
    opts: import('@qwery/extensions-sdk').DriverAttachOptions,
  ) => Promise<import('@qwery/extensions-sdk').DriverAttachResult>;
  detach?: (
    opts: import('@qwery/extensions-sdk').DriverDetachOptions,
  ) => Promise<void>;
} | null> {
  try {
    const extensionsSdk = await import('@qwery/extensions-sdk');
    const extensionsLoader = await import('@qwery/extensions-loader');
    const { getDiscoveredDatasource } = extensionsSdk;
    const { getDriverInstance } = extensionsLoader;
    const dsMeta = await getDiscoveredDatasource('parquet-online');
    if (!dsMeta?.drivers?.length) return null;
    const driverMeta =
      dsMeta.drivers.find(
        (d: { id: string }) =>
          d.id.includes('duckdb') || d.id === 'parquet-online.duckdb',
      ) ?? dsMeta.drivers[0];
    if (!driverMeta) return null;
    const driver = await getDriverInstance(
      {
        id: driverMeta.id,
        packageDir: dsMeta.packageDir,
        entry: driverMeta.entry,
        runtime: (driverMeta.runtime as 'node' | 'browser') || 'node',
        name: driverMeta.name ?? driverMeta.id,
      },
      { queryEngineConnection: conn },
    );
    if (typeof driver.attach !== 'function') return null;
    return driver as {
      attach: (
        opts: import('@qwery/extensions-sdk').DriverAttachOptions,
      ) => Promise<import('@qwery/extensions-sdk').DriverAttachResult>;
      detach?: (
        opts: import('@qwery/extensions-sdk').DriverDetachOptions,
      ) => Promise<void>;
    };
  } catch {
    return null;
  }
}
