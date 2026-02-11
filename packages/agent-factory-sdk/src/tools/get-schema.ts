import { z } from 'zod';
import { Tool } from './tool';
import {
  ExtensionsRegistry,
  type DatasourceExtension,
} from '@qwery/extensions-sdk';
import { getDriverInstance } from '@qwery/extensions-loader';
import { getLogger } from '@qwery/shared/logger';
import { Repositories } from '@qwery/domain/repositories';

const DESCRIPTION = `Get schema information (columns, data types) for a datasource using its native driver.
Returns column names and types for all tables/views in the datasource.`;

export const GetSchemaTool = Tool.define('getSchema', {
  description: DESCRIPTION,
  parameters: z.object({}),
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
      throw new Error(`Datasource not found: ${params.datasourceId}`);
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

      const allTables = metadata.tables.length;
      logger.debug(
        `[GetSchemaTool] Fetched schema for datasource ${attachedDatasources[0]}: ${allTables} table(s)`,
      );

      return {
        schema: metadata,
      };
    } finally {
      if (typeof instance.close === 'function') {
        await instance.close();
      }
    }
  },
});
