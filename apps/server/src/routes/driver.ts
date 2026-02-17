import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { getDriverInstance } from '@qwery/extensions-loader';
import {
  ExtensionsRegistry,
  type DatasourceExtension,
} from '@qwery/extensions-sdk';
import { getLogger } from '@qwery/shared/logger';
import { DomainException } from '@qwery/domain/exceptions';
import { Code } from '@qwery/domain/common';
import { handleDomainException } from '../lib/http-utils';

const bodySchema = z.object({
  action: z.enum(['testConnection', 'metadata', 'query']),
  datasourceProvider: z.string(),
  driverId: z.string().optional(),
  config: z.record(z.string(), z.unknown()),
  sql: z.string().optional(),
});

export function createDriverRoutes() {
  const app = new Hono();

  app.post('/command', zValidator('json', bodySchema), async (c) => {
    const logger = await getLogger();
    const body = c.req.valid('json');
    const { action, datasourceProvider, driverId, config, sql } = body;

    const dsMeta = ExtensionsRegistry.get(datasourceProvider) as
      | DatasourceExtension
      | undefined;
    if (!dsMeta) {
      logger.error({ datasourceProvider, driverId }, 'Datasource not found');
      return handleDomainException(
        DomainException.new({
          code: Code.DATASOURCE_NOT_FOUND_ERROR,
          overrideMessage: 'Datasource not found',
        }),
      );
    }

    const driver =
      dsMeta.drivers?.find((d) => d.id === driverId) ?? dsMeta.drivers?.[0];
    if (!driver) {
      logger.error({ datasourceProvider, driverId }, 'Driver not found');
      return handleDomainException(
        DomainException.new({
          code: Code.DATASOURCE_NOT_FOUND_ERROR,
          overrideMessage: 'Driver not found',
        }),
      );
    }

    if (driver.runtime !== 'node') {
      logger.error(
        { datasourceProvider, driverId },
        'Driver is not node runtime for server execution',
      );
      return handleDomainException(
        DomainException.new({
          code: Code.BAD_REQUEST_ERROR,
          overrideMessage: 'Driver is not node runtime for server execution',
        }),
      );
    }

    try {
      const instance = await getDriverInstance(driver, {
        config,
      });

      switch (action) {
        case 'testConnection':
          await instance.testConnection();
          return c.json({
            success: true,
            data: { connected: true, message: 'ok' },
          });
        case 'metadata': {
          const metadata = await instance.metadata();
          return c.json({
            success: true,
            data: metadata,
          });
        }
        case 'query': {
          if (!sql) {
            return handleDomainException(
              DomainException.new({
                code: Code.BAD_REQUEST_ERROR,
                overrideMessage: 'SQL is required for query action',
              }),
            );
          }
          const queryResult = await instance.query(sql);
          return c.json({
            success: true,
            data: queryResult,
          });
        }
        default:
          return handleDomainException(
            DomainException.new({
              code: Code.BAD_REQUEST_ERROR,
              overrideMessage: 'Unknown action',
            }),
          );
      }
    } catch (error) {
      logger.error({ error }, 'Error executing driver action');
      return handleDomainException(
        DomainException.new({
          code: Code.INTERNAL_ERROR,
          overrideMessage: formatError(error),
        }),
      );
    }
  });

  return app;
}

function formatError(error: unknown): string {
  if (error instanceof AggregateError) {
    const inner = (error.errors || [])
      .map((e) => (e instanceof Error ? e.message : String(e)))
      .filter(Boolean)
      .join('; ');
    return inner || error.message || 'Aggregate driver error';
  }
  if (error instanceof Error) return error.message || error.toString();
  return String(error);
}
