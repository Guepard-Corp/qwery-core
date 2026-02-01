import type {
  AttachmentStrategy,
  AttachmentResult,
  GSheetAttachmentOptions,
} from '../types';
import { getDatasourceDatabaseName } from '../../datasource-name-utils';
import type { SimpleSchema } from '@qwery/domain/entities';

/** Get gsheet-csv driver with attach support (uses queryEngineConnection). Exported for use by DatasourceAttachmentService. */
export async function getGSheetDriverWithConnection(conn: unknown): Promise<{
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
    const dsMeta = await getDiscoveredDatasource('gsheet-csv');
    if (!dsMeta?.drivers?.length) return null;
    const driverMeta =
      dsMeta.drivers.find(
        (d: { id: string }) =>
          d.id.includes('duckdb') || d.id === 'gsheet-csv.duckdb',
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

export class GSheetAttachmentStrategy implements AttachmentStrategy {
  canHandle(provider: string): boolean {
    return provider === 'gsheet-csv';
  }

  async attach(options: GSheetAttachmentOptions): Promise<AttachmentResult> {
    const {
      connection: conn,
      datasource,
      extractSchema: shouldExtractSchema = true,
      conversationId,
      workspace,
    } = options;

    const config = datasource.config as Record<string, unknown>;
    const sharedLink = (config.sharedLink as string) || (config.url as string);

    if (!sharedLink) {
      throw new Error(
        'gsheet-csv datasource requires sharedLink or url in config',
      );
    }

    const schemaName = getDatasourceDatabaseName(datasource);

    const driverWithAttach = await getGSheetDriverWithConnection(conn);
    if (!driverWithAttach) {
      throw new Error(
        'gsheet-csv extension driver not found or does not implement attach. Ensure the gsheet-csv extension is installed.',
      );
    }

    const result = await driverWithAttach.attach({
      config: datasource.config,
      schemaName,
      conversationId,
      workspace,
    });

    const tables: AttachmentResult['tables'] = [];
    for (let i = 0; i < result.tables.length; i++) {
      const t = result.tables[i]!;
      let schemaDefinition: SimpleSchema | undefined;
      if (shouldExtractSchema && i === 0) {
        try {
          const escapedSchema = t.schema.replace(/"/g, '""');
          const escapedTable = t.table.replace(/"/g, '""');
          const describeReader = await conn.runAndReadAll(
            `DESCRIBE "${escapedSchema}"."${escapedTable}"`,
          );
          await describeReader.readAll();
          const rows = describeReader.getRowObjectsJS() as Array<{
            column_name: string;
            column_type: string;
          }>;
          const columns = rows.map((row) => ({
            columnName: row.column_name,
            columnType: row.column_type,
          }));
          schemaDefinition = {
            databaseName: schemaName,
            schemaName: t.schema,
            tables: [{ tableName: t.table, columns }],
          };
        } catch {
          // ignore
        }
      }
      tables.push({
        schema: t.schema,
        table: t.table,
        path: t.path,
        schemaDefinition,
      });
    }

    return {
      attachedDatabaseName: schemaName,
      tables,
    };
  }
}
