import { z } from 'zod';
import type {
  DatasourceMetadata,
  Table,
  Column,
  Schema,
  SimpleSchema,
} from '@qwery/domain/entities';
import { Tool } from './tool';
import {
  ExtensionsRegistry,
  type DatasourceExtension,
} from '@qwery/extensions-sdk';
import { getDriverInstance } from '@qwery/extensions-loader';
import { getLogger } from '@qwery/shared/logger';
import { Repositories } from '@qwery/domain/repositories';
import { TransformMetadataToSimpleSchemaService } from '@qwery/domain/services';

const DESCRIPTION = `Get schema information (columns, data types) for attached datasource(s) using their native drivers.
Use detailLevel="simple" (default) to return only tables and column types (token efficient).
Use detailLevel="full" only when you need complete driver metadata. When multiple datasources are attached, returns merged schema for all.`;

const GetSchemaDetailLevelSchema = z.enum(['simple', 'full']).default('simple');
const transformMetadataToSimpleSchemaService =
  new TransformMetadataToSimpleSchemaService();

function schemaPrefix(datasource: {
  name?: string | null;
  slug?: string | null;
  id: string;
}): string {
  const raw = datasource.name || datasource.slug || datasource.id;
  return (
    String(raw)
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_-]/g, '') || datasource.id
  );
}

function inferDatasourceDatabaseName(metadata: DatasourceMetadata): string {
  for (const column of metadata.columns) {
    const catalog = (column as { database?: string }).database;
    if (!catalog || catalog === 'memory') {
      continue;
    }

    if (catalog !== 'main') {
      return catalog;
    }
  }

  return 'main';
}

function toSortedSimpleSchemaArray(
  schemaMap: Map<string, SimpleSchema>,
): SimpleSchema[] {
  return Array.from(schemaMap.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, schema]) => schema);
}

export const GetSchemaTool = Tool.define('getSchema', {
  description: DESCRIPTION,
  parameters: z.object({
    detailLevel: GetSchemaDetailLevelSchema.describe(
      'Schema verbosity: "simple" for table/column names only, "full" for complete metadata',
    ),
  }),
  async execute(params, ctx) {
    const logger = await getLogger();
    const { repositories, attachedDatasources } = ctx.extra as {
      repositories: Repositories;
      attachedDatasources: string[];
    };

    if (!attachedDatasources?.length) {
      throw new Error('No datasources attached');
    }

    logger.debug('[GetSchemaTool] Tool execution:', { attachedDatasources });

    const schemaErrors: Array<{
      datasourceId: string;
      datasourceName?: string;
      error: string;
    }> = [];

    type SchemaResultSuccess = {
      datasourceId: string;
      datasource: {
        id: string;
        name?: string | null;
        slug?: string | null;
        datasource_provider: string;
        config: unknown;
      };
      datasourceDisplayName?: string;
      metadata: DatasourceMetadata;
    };

    type SchemaResultError = {
      datasourceId: string;
      datasourceDisplayName?: string;
      error: string;
    };

    const results: Array<SchemaResultSuccess | SchemaResultError> =
      await Promise.all(
        attachedDatasources.map(async (datasourceId) => {
          let datasourceDisplayName: string | undefined;
          try {
            const datasource =
              await repositories.datasource.findById(datasourceId);
            if (!datasource) {
              return { datasourceId, error: 'Datasource not found' };
            }

            datasourceDisplayName =
              datasource.name || datasource.slug || datasourceId;

            const extension = ExtensionsRegistry.get(
              datasource.datasource_provider,
            ) as DatasourceExtension | undefined;
            if (!extension?.drivers?.length) {
              return {
                datasourceId,
                datasourceDisplayName,
                error: `No driver for provider: ${datasource.datasource_provider}`,
              };
            }

            const nodeDriver =
              extension.drivers.find((d) => d.runtime === 'node') ??
              extension.drivers[0];
            if (!nodeDriver) {
              return {
                datasourceId,
                datasourceDisplayName,
                error: `No node driver for provider: ${datasource.datasource_provider}`,
              };
            }

            const instance = await getDriverInstance(nodeDriver, {
              config: datasource.config,
            });

            const metadata = await instance.metadata();
            if (typeof instance.close === 'function') {
              const closeResult = instance.close();
              if (
                closeResult &&
                typeof (closeResult as Promise<unknown>).catch === 'function'
              ) {
                void (closeResult as Promise<unknown>).catch(() => {});
              }
            }
            return { datasourceId, datasource, datasourceDisplayName, metadata };
          } catch (err) {
            return {
              datasourceId,
              datasourceDisplayName,
              error: err instanceof Error ? err.message : String(err),
            };
          }
        }),
      );

    for (const result of results) {
      if ('error' in result) {
        schemaErrors.push({
          datasourceId: result.datasourceId,
          datasourceName: result.datasourceDisplayName,
          error: result.error,
        });
        logger.warn(
          `[GetSchemaTool] Failed to fetch schema for ${result.datasourceId}: ${result.error}`,
        );
      }
    }

    if (params.detailLevel === 'simple') {
      const successResults = results.filter(
        (r): r is SchemaResultSuccess => !('error' in r),
      );

      if (successResults.length === 0) {
        const errorSummary =
          schemaErrors.length > 0
            ? schemaErrors
                .map((e) => `${e.datasourceName ?? e.datasourceId}: ${e.error}`)
                .join('; ')
            : 'Check that datasources exist and have a supported driver.';
        throw new Error(
          `Could not load schema for any attached datasource. ${errorSummary}`,
        );
      }

      const datasources = await Promise.all(
        successResults.map(async (result) => {
          const { datasource, metadata } = result;
          const inferredDatabaseName = inferDatasourceDatabaseName(metadata);
          const datasourceDatabaseMap = new Map<string, string>([
            [datasource.id, inferredDatabaseName],
          ]);
          const datasourceProviderMap = new Map<string, string>([
            [datasource.id, datasource.datasource_provider],
          ]);

          const simpleSchemaMap =
            await transformMetadataToSimpleSchemaService.execute({
              metadata,
              datasourceDatabaseMap,
              datasourceProviderMap,
            });

          const schema = toSortedSimpleSchemaArray(simpleSchemaMap);
          const tableCount = schema.reduce(
            (count, s) => count + s.tables.length,
            0,
          );

          logger.debug(
            `[GetSchemaTool] Fetched simple schema for datasource ${datasource.id}: ${tableCount} table(s) in ${schema.length} schema group(s)`,
          );

          return {
            datasourceId: datasource.id,
            datasourceName: result.datasourceDisplayName,
            schema,
          };
        }),
      );

      return {
        detailLevel: 'simple' as const,
        datasources,
        ...(schemaErrors.length > 0 && { schemaErrors }),
      };
    }

    // full mode: merge all datasources with prefix
    const merged: DatasourceMetadata = {
      version: '',
      driver: '',
      schemas: [],
      tables: [],
      columns: [],
    };

    let nextTableId = 1;
    let nextSchemaId = 1;

    for (const result of results) {
      if ('error' in result) continue;

      const { datasource, metadata, datasourceDisplayName } = result;
      const prefix = schemaPrefix(datasource);
      const tableIdMap = new Map<number, number>();

      for (const t of metadata.tables ?? []) {
        const newId = nextTableId++;
        tableIdMap.set(t.id, newId);
        const table: Table = {
          ...t,
          id: newId,
          schema: `${prefix}__${t.schema || 'main'}`,
        };
        merged.tables.push(table);
      }

      for (const col of metadata.columns ?? []) {
        const newTableId = tableIdMap.get(col.table_id) ?? col.table_id;
        const newCol: Column = {
          ...col,
          id: `${datasource.id}_${col.id}`,
          table_id: newTableId,
          schema: `${prefix}__${col.schema || 'main'}`,
        };
        merged.columns.push(newCol);
      }

      for (const s of metadata.schemas ?? []) {
        const schemaEntry: Schema = {
          ...s,
          id: nextSchemaId++,
          name: `${prefix}__${s.name}`,
        };
        merged.schemas.push(schemaEntry);
      }

      if (merged.version === '' && metadata.version)
        merged.version = metadata.version;
      if (merged.driver === '' && metadata.driver)
        merged.driver = metadata.driver;

      logger.debug(
        `[GetSchemaTool] Results merged for ${datasourceDisplayName}: ${metadata.tables?.length ?? 0} table(s)`,
      );
    }

    if (merged.tables.length === 0 && merged.columns.length === 0) {
      const errorSummary =
        schemaErrors.length > 0
          ? schemaErrors
              .map((e) => `${e.datasourceName ?? e.datasourceId}: ${e.error}`)
              .join('; ')
          : 'Check that datasources exist and have a supported driver.';
      throw new Error(
        `Could not load schema for any attached datasource. ${errorSummary}`,
      );
    }

    return {
      detailLevel: 'full' as const,
      schema: merged,
      ...(schemaErrors.length > 0 && { schemaErrors }),
    };
  },
});
