import { z } from 'zod';
import { Tool } from './tool';
import {
  ExtensionsRegistry,
  type DatasourceExtension,
} from '@qwery/extensions-sdk';
import { getDriverInstance } from '@qwery/extensions-loader';
import { getLogger } from '@qwery/shared/logger';
import { Repositories } from '@qwery/domain/repositories';
import type { DatasourceMetadata, SimpleSchema } from '@qwery/domain/entities';
import { TransformMetadataToSimpleSchemaService } from '@qwery/domain/services';

const DESCRIPTION = `Get schema information for the attached datasource.
Use detailLevel="simple" (default) to return only tables and column types (token efficient).
Use detailLevel="full" only when you need complete driver metadata.`;

const GetSchemaDetailLevelSchema = z.enum(['simple', 'full']).default('simple');
const transformMetadataToSimpleSchemaService =
  new TransformMetadataToSimpleSchemaService();

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

    logger.debug('[GetSchemaTool] Tool execution:', {
      attachedDatasources,
    });

    const datasource = await repositories.datasource.findById(
      attachedDatasources[0] ?? '',
    );
    if (!datasource) {
      throw new Error(`Datasource not found: ${attachedDatasources[0] ?? ''}`);
    }

    const extension = ExtensionsRegistry.get(datasource.datasource_provider) as
      | DatasourceExtension
      | undefined;
    if (!extension?.drivers?.length) {
      throw new Error(
        `No driver found for provider: ${datasource.datasource_provider}`,
      );
    }

    const nodeDriver =
      extension.drivers.find((d) => d.runtime === 'node') ??
      extension.drivers[0];
    if (!nodeDriver) {
      throw new Error(
        `No node driver for provider: ${datasource.datasource_provider}`,
      );
    }

    const instance = await getDriverInstance(nodeDriver, {
      config: datasource.config,
    });

    try {
      const metadata = await instance.metadata();

      if (params.detailLevel === 'full') {
        const allTables = metadata.tables.length;
        logger.debug(
          `[GetSchemaTool] Fetched full schema for datasource ${attachedDatasources[0]}: ${allTables} table(s)`,
        );

        return {
          detailLevel: 'full' as const,
          schema: metadata,
        };
      }

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

      const simpleSchema = toSortedSimpleSchemaArray(simpleSchemaMap);
      const tableCount = simpleSchema.reduce(
        (count, schema) => count + schema.tables.length,
        0,
      );

      logger.debug(
        `[GetSchemaTool] Fetched simple schema for datasource ${attachedDatasources[0]}: ${tableCount} table(s) in ${simpleSchema.length} schema group(s)`,
      );

      return {
        detailLevel: 'simple' as const,
        schema: simpleSchema,
      };
    } finally {
      if (typeof instance.close === 'function') {
        await instance.close();
      }
    }
  },
});
