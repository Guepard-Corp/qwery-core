import { z } from 'zod';
import type {
  DatasourceMetadata,
  Table,
  Column,
  Schema,
} from '@qwery/domain/entities';
import { Tool } from './tool';
import {
  ExtensionsRegistry,
  type DatasourceExtension,
} from '@qwery/extensions-sdk';
import { getDriverInstance } from '@qwery/extensions-loader';
import { getLogger } from '@qwery/shared/logger';
import { Repositories } from '@qwery/domain/repositories';

const DESCRIPTION = `Get schema information (columns, data types) for attached datasource(s) using their native drivers.
Returns column names and types for all tables/views. When multiple datasources are attached, returns merged schema for all.`;

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

export const GetSchemaTool = Tool.define('getSchema', {
  description: DESCRIPTION,
  parameters: z.object({}),
  async execute(_params, ctx) {
    const logger = await getLogger();
    const { repositories, attachedDatasources } = ctx.extra as {
      repositories: Repositories;
      attachedDatasources: string[];
    };

    if (!attachedDatasources?.length) {
      throw new Error('No datasources attached');
    }

    logger.debug('[GetSchemaTool] Tool execution:', { attachedDatasources });

    const merged: DatasourceMetadata = {
      version: '',
      driver: '',
      schemas: [],
      tables: [],
      columns: [],
    };

    const schemaErrors: Array<{
      datasourceId: string;
      datasourceName?: string;
      error: string;
    }> = [];

    let nextTableId = 1;
    let nextSchemaId = 1;

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
              return {
                datasourceId,
                error: 'Datasource not found',
              };
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
            return {
              datasourceId,
              datasource,
              datasourceDisplayName,
              metadata,
            };
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
          error: result.error!,
        });
        logger.warn(
          `[GetSchemaTool] Failed to fetch schema for ${result.datasourceId}: ${result.error}`,
        );
        continue;
      }

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
      schema: merged,
      ...(schemaErrors.length > 0 && { schemaErrors }),
    };
  },
});
