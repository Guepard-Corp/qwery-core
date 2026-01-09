import type {
  AttachmentStrategy,
  AttachmentResult,
  ClickHouseAttachmentOptions,
} from '../types';
import { extractSchema } from '../../extract-schema';
import { extractConnectionUrl } from '@qwery/extensions-sdk';
import { getDatasourceDatabaseName } from '../../datasource-name-utils';
import { setClickHouseSchemaMappings } from '../../clickhouse-schema-mapping';

export class ClickHouseAttachmentStrategy implements AttachmentStrategy {
  canHandle(provider: string): boolean {
    return provider === 'clickhouse-node' || provider === 'clickhouse-web';
  }

  async attach(options: ClickHouseAttachmentOptions): Promise<AttachmentResult> {
    const { connection: conn, datasource, conversationId, workspace } = options;

    if (!conversationId || !workspace) {
      throw new Error(
        'ClickHouse datasource requires conversationId and workspace for persistent database attachment',
      );
    }

    const provider = datasource.datasource_provider;
    const config = datasource.config as Record<string, unknown>;

    // Dynamically import extensions-sdk and extensions-loader
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - Dynamic import, module will be available at runtime
    const extensionsSdk = await import('@qwery/extensions-sdk');
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - Dynamic import, module will be available at runtime
    const extensionsLoader = await import('@qwery/extensions-loader');
    const { getDiscoveredDatasource } = extensionsSdk;
    const { getDriverInstance } = extensionsLoader;

    // Get extension metadata to find the driver
    const dsMeta = await getDiscoveredDatasource(datasource.datasource_provider);
    if (!dsMeta) {
      throw new Error(
        `Extension metadata not found for provider: ${datasource.datasource_provider}`,
      );
    }

    // Find the appropriate driver
    let driverId: string | undefined = datasource.datasource_driver;

    if (driverId) {
      const foundDriver = dsMeta.drivers.find(
        (d: { id: string }) => d.id === driverId,
      );
      if (!foundDriver) {
        const matchingDriver = dsMeta.drivers.find(
          (d: { id: string }) =>
            d.id.includes(driverId!) ||
            d.id.includes(datasource.datasource_provider),
        );
        if (matchingDriver) {
          driverId = matchingDriver.id;
        } else {
          driverId = undefined;
        }
      }
    }

    if (!driverId) {
      const duckdbDriver = dsMeta.drivers.find(
        (d: { id: string }) =>
          d.id.includes('duckdb') ||
          d.id.includes(datasource.datasource_provider),
      );
      if (duckdbDriver) {
        driverId = duckdbDriver.id;
      } else if (dsMeta.drivers.length > 0) {
        driverId = dsMeta.drivers[0]?.id;
      }
    }

    if (!driverId) {
      throw new Error(
        `No driver found for datasource provider: ${datasource.datasource_provider}. Available drivers: ${dsMeta.drivers.map((d: { id: string }) => d.id).join(', ')}`,
      );
    }

    // Load and instantiate the driver
    const driverMeta = dsMeta.drivers.find(
      (d: { id: string }) => d.id === driverId,
    );
    if (!driverMeta) {
      throw new Error(
        `Driver ${driverId} not found in extension metadata. Available drivers: ${dsMeta.drivers.map((d: { id: string }) => d.id).join(', ')}`,
      );
    }

    const driver = await getDriverInstance({
      id: driverId,
      packageDir: dsMeta.packageDir,
      entry: driverMeta.entry,
      runtime: (driverMeta.runtime as 'node' | 'browser') || 'node',
      name: driverMeta.name || driverId,
    });

    try {
      // Test connection
      await driver.testConnection(datasource.config);

      // Get metadata to understand the schema
      // Pass connection so driver can create views in main engine if supported
      const metadata = await driver.metadata(datasource.config, conn);

      // Get connection URL for ClickHouse HTTP interface
      const connectionUrl = extractConnectionUrl(
        datasource.config as Record<string, unknown>,
        provider,
      );

      // Parse connection URL to extract host and port
      let clickhouseHost = 'localhost';
      let clickhousePort = 8123;
      try {
        const url = new URL(connectionUrl);
        clickhouseHost = url.hostname;
        clickhousePort = url.port ? parseInt(url.port, 10) : 8123;
      } catch {
        // If URL parsing fails, try to extract from connectionUrl string
        const match = connectionUrl.match(/http:\/\/([^:]+):(\d+)/);
        if (match) {
          clickhouseHost = match[1]!;
          clickhousePort = parseInt(match[2]!, 10);
        }
      }

      // Use datasource name directly as database name (sanitized)
      const attachedDatabaseName = getDatasourceDatabaseName(datasource);
      const escapedDbName = attachedDatabaseName.replace(/"/g, '""');

      // Create persistent attached database using SQLite file
      try {
        const escapedDbNameForQuery = attachedDatabaseName.replace(/'/g, "''");
        const dbListReader = await conn.runAndReadAll(
          `SELECT name FROM pragma_database_list WHERE name = '${escapedDbNameForQuery}'`,
        );
        await dbListReader.readAll();
        const existingDbs = dbListReader.getRowObjectsJS() as Array<{
          name: string;
        }>;

        if (existingDbs.length === 0) {
          // Construct persistent database file path
          const { join } = await import('node:path');
          const { mkdir } = await import('node:fs/promises');
          const conversationDir = join(workspace, conversationId);
          await mkdir(conversationDir, { recursive: true });
          const dbFilePath = join(conversationDir, `${attachedDatabaseName}.db`);

          // Escape single quotes in file path for SQL injection protection
          const escapedPath = dbFilePath.replace(/'/g, "''");

          // Attach persistent SQLite database file
          await conn.run(`ATTACH '${escapedPath}' AS "${escapedDbName}"`);

          console.log(
            `[ClickHouseAttach] Attached persistent database: ${attachedDatabaseName} at ${dbFilePath}`,
          );
        }
      } catch (error) {
        console.warn(
          `[ClickHouseAttach] Could not attach database ${attachedDatabaseName}, continuing:`,
          error,
        );
      }

      // Store schema mapping: table_name -> original_schema_name
      const schemaMapping = new Map<string, string>();

      // Get unique schemas from metadata
      const uniqueSchemas = new Set(
        metadata.tables.map((t) => t.schema || 'default'),
      );

      // Loop through ALL schemas
      for (const schemaName of uniqueSchemas) {
        // Filter tables for this schema
        const schemaTables = metadata.tables.filter(
          (t) => (t.schema || 'default') === schemaName,
        );

        // Loop through ALL tables in this schema
        for (const table of schemaTables) {
          try {
            const tableName = table.name;
            const originalSchema = table.schema || 'default';

            // Store schema mapping
            schemaMapping.set(tableName, originalSchema);

            // Build HTTP URL for ClickHouse JSONEachRow format
            const query = `SELECT * FROM ${originalSchema}.${tableName} LIMIT 1000 FORMAT JSONEachRow`;
            const encodedQuery = encodeURIComponent(query);
            const httpUrl = `http://${clickhouseHost}:${clickhousePort}/?query=${encodedQuery}`;

            // Escape table name for SQL
            const escapedTableName = tableName.replace(/"/g, '""');

            // Create table in attached database using HTTP JSONEachRow format
            // SQLite only supports "main" schema, so we create in main
            const escapedHttpUrl = httpUrl.replace(/'/g, "''");
            await conn.run(`
              CREATE TABLE IF NOT EXISTS "${escapedDbName}"."main"."${escapedTableName}" AS
              SELECT * FROM read_json_auto('${escapedHttpUrl}')
            `);

            console.log(
              `[ClickHouseAttach] Created table ${attachedDatabaseName}.main.${tableName} from schema ${originalSchema}`,
            );
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.error(
              `[ClickHouseAttach] Failed to create table ${table.name} from schema ${schemaName}:`,
              errorMsg,
            );
            // Continue with other tables even if one fails
          }
        }
      }

      if (schemaMapping.size === 0) {
        throw new Error('No tables were successfully created from ClickHouse metadata');
      }

      // Store schema mapping for later use in transform service
      setClickHouseSchemaMappings(datasource.id, schemaMapping);

      // Get the first table for return value (agent will discover all via metadata)
      const firstTable = metadata.tables[0];
      if (!firstTable) {
        throw new Error('No tables found in datasource metadata');
      }

      // Extract schema from the first table
      const firstTableName = firstTable.name;
      const escapedFirstTableName = firstTableName.replace(/"/g, '""');
      const schema = await extractSchema({
        connection: conn,
        viewName: `${attachedDatabaseName}.main.${firstTableName}`,
      });

      // Return first table info (agent will discover all via metadata)
      return {
        viewName: `${attachedDatabaseName}.main.${firstTableName}`,
        displayName: firstTableName,
        schema,
      };
    } finally {
      // Close driver if it has a close method
      if (driver.close) {
        await driver.close();
      }
    }
  }
}
