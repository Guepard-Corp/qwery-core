import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { getDriverInstance } from '@qwery/extensions-loader';
import type { DiscoveredDriver } from '@qwery/extensions-sdk';
import { getDatasourceTypes } from '@qwery/datasource-registry';
import { getLogger } from '@qwery/shared/logger';

const bodySchema = z.object({
  action: z.literal('testConnection'),
  datasourceProvider: z.string(),
  driverId: z.string().optional(),
  config: z.record(z.string(), z.unknown()),
});

export function createDriverRoutes() {
  const app = new Hono();

  app.post('/command', zValidator('json', bodySchema), async (c) => {
    const logger = await getLogger();
    const body = c.req.valid('json');
    const { action, datasourceProvider, driverId, config } = body;

    const types = getDatasourceTypes();
    const dsMeta = types.find((ds) => ds.id === datasourceProvider);
    if (!dsMeta) {
      logger.error({ datasourceProvider, driverId }, 'Datasource not found');
      return c.json({ error: 'Datasource not found' }, 404);
    }

    const driver =
      dsMeta.drivers?.find((d) => d.id === driverId) ?? dsMeta.drivers?.[0];
    if (!driver) {
      logger.error({ datasourceProvider, driverId }, 'Driver not found');
      return c.json({ error: 'Driver not found' }, 404);
    }

    if (driver.runtime !== 'node') {
      logger.error(
        { datasourceProvider, driverId },
        'Driver is not node runtime for server execution',
      );
      return c.json(
        { error: 'Driver is not node runtime for server execution' },
        400,
      );
    }

    try {
      const instance = await getDriverInstance(driver as DiscoveredDriver);
      if (action === 'testConnection') {
        await instance.testConnection(config);
        return c.json({
          success: true,
          data: { connected: true, message: 'ok' },
        });
      }
      return c.json({ error: 'Unknown action' }, 400);
    } catch (error) {
      logger.error({ error }, 'Error executing driver action');
      const message = formatError(error);
      return c.json({ error: message }, 500);
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
