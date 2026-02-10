import { Hono } from 'hono';
import type { Repositories } from '@qwery/domain/repositories';
import {
  ExtensionsRegistry,
  type DatasourceExtension,
} from '@qwery/extensions-sdk';
import { getDriverInstance } from '@qwery/extensions-loader';
import { handleDomainException } from '../lib/http-utils';

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
        return c.json(
          {
            error:
              'Missing required fields: conversationId, query, datasourceId',
          },
          400,
        );
      }

      const repos = await getRepositories();
      const datasource = await repos.datasource.findById(datasourceId);
      if (!datasource) {
        return c.json({ error: `Datasource ${datasourceId} not found` }, 404);
      }

      const extension = ExtensionsRegistry.get(
        datasource.datasource_provider,
      ) as DatasourceExtension | undefined;

      if (!extension?.drivers?.length) {
        return c.json(
          {
            error: `No driver found for provider: ${datasource.datasource_provider}`,
          },
          404,
        );
      }

      const nodeDriver =
        extension.drivers.find((d) => d.runtime === 'node') ??
        extension.drivers[0];

      if (!nodeDriver || nodeDriver.runtime !== 'node') {
        return c.json(
          {
            error: `No node driver for provider: ${datasource.datasource_provider}`,
          },
          400,
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
            return c.json(
              {
                error: `Query failed: ${errorMessage}. Expected database: "${expectedDbName}".`,
              },
              400,
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
