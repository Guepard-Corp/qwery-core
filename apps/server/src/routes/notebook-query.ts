import { Hono } from 'hono';
import type { Repositories } from '@qwery/domain/repositories';
import {
  ExtensionsRegistry,
  type DatasourceExtension,
} from '@qwery/extensions-sdk';
import { getDriverInstance } from '@qwery/extensions-loader';
import {
  handleDomainException,
  createValidationErrorResponse,
  createNotFoundErrorResponse,
} from '../lib/http-utils';
import { Code } from '@qwery/domain/common';

export function createNotebookQueryRoutes(
  getRepositories: () => Promise<Repositories>,
) {
  const app = new Hono();

  app.post('/', async (c) => {
    try {
      const body = (await c.req.json()) as {
        conversationId?: string;
        query?: string;
        datasourceId?: string;
      };
      const { conversationId, query, datasourceId } = body;

      if (!conversationId || !query || !datasourceId) {
        return createValidationErrorResponse(
          'Missing required fields: conversationId, query, datasourceId',
        );
      }

      const repos = await getRepositories();
      const datasource = await repos.datasource.findById(datasourceId);
      if (!datasource) {
        return createNotFoundErrorResponse(
          `Datasource ${datasourceId} not found`,
          Code.DATASOURCE_NOT_FOUND_ERROR,
        );
      }

      const extension = ExtensionsRegistry.get(
        datasource.datasource_provider,
      ) as DatasourceExtension | undefined;

      if (!extension?.drivers?.length) {
        return createNotFoundErrorResponse(
          `No driver found for provider: ${datasource.datasource_provider}`,
          Code.DATASOURCE_NOT_FOUND_ERROR,
        );
      }

      const nodeDriver =
        extension.drivers.find((d) => d.runtime === 'node') ??
        extension.drivers[0];

      if (!nodeDriver || nodeDriver.runtime !== 'node') {
        return createValidationErrorResponse(
          `No node driver for provider: ${datasource.datasource_provider}`,
        );
      }

      const instance = await getDriverInstance(nodeDriver, {
        config: datasource.config,
      });

      const expectedDbName = datasource.name;

      try {
        const trimmedQuery = query.trim();

        try {
          const result = await instance.query(trimmedQuery);
          const data = {
            ...result,
            stat: result.stat ?? {
              rowsAffected: 0,
              rowsRead: result.rows.length,
              rowsWritten: 0,
              queryDurationMs: null,
            },
          };
          return c.json({ success: true, data });
        } catch (queryError) {
          const errorMessage =
            queryError instanceof Error
              ? queryError.message
              : String(queryError);
          if (
            errorMessage.includes('does not exist') ||
            errorMessage.includes('Catalog Error')
          ) {
            return createValidationErrorResponse(
              `Query failed: ${errorMessage}. Expected database: "${expectedDbName}".`,
            );
          }
          throw queryError;
        }
      } finally {
        if (typeof instance.close === 'function') {
          await instance.close();
        }
      }
    } catch (error) {
      return handleDomainException(error);
    }
  });

  return app;
}
