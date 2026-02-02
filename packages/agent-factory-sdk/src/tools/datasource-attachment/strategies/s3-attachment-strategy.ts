/** Get S3 driver with attach support (uses queryEngineConnection). Exported for use by DatasourceAttachmentService. */
export async function getS3DriverWithConnection(conn: unknown): Promise<{
  attach: (
    opts: import('@qwery/extensions-sdk').DriverAttachOptions,
  ) => Promise<import('@qwery/extensions-sdk').DriverAttachResult>;
  detach?: (
    opts: import('@qwery/extensions-sdk').DriverDetachOptions,
  ) => Promise<void>;
} | null> {
  try {
    const { getLogger } = await import('@qwery/shared/logger');
    const logger = await getLogger();
    const extensionsSdk = await import('@qwery/extensions-sdk');
    const extensionsLoader = await import('@qwery/extensions-loader');
    const { getDiscoveredDatasource } = extensionsSdk;
    const { getDriverInstance } = extensionsLoader;
    const dsMeta = await getDiscoveredDatasource('s3');
    if (!dsMeta?.drivers?.length) {
      logger.debug(
        '[S3Attachment] getDiscoveredDatasource("s3") returned no drivers',
      );
      return null;
    }
    const driverMeta =
      dsMeta.drivers.find(
        (d: { id: string }) => d.id.includes('duckdb') || d.id === 's3.duckdb',
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
    if (typeof driver.attach !== 'function') {
      logger.debug(
        '[S3Attachment] S3 driver loaded but does not implement attach',
      );
      return null;
    }
    return driver as {
      attach: (
        opts: import('@qwery/extensions-sdk').DriverAttachOptions,
      ) => Promise<import('@qwery/extensions-sdk').DriverAttachResult>;
      detach?: (
        opts: import('@qwery/extensions-sdk').DriverDetachOptions,
      ) => Promise<void>;
    };
  } catch (err) {
    const { getLogger } = await import('@qwery/shared/logger');
    const logger = await getLogger();
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn(
      `[S3Attachment] Failed to load S3 driver for attach: ${msg}`,
      err instanceof Error ? err : undefined,
    );
    return null;
  }
}
