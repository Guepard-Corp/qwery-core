import { getDriverInstance } from '@qwery/extensions-loader';
import type { DiscoveredDriver } from '@qwery/extensions-sdk';
import { getLogger } from '@qwery/shared/logger';
import { DATASOURCES } from '~/lib/datasources-loader';

type DriverActionRequest = {
  action: 'testConnection' | 'metadata' | 'query';
  datasourceProvider: string;
  driverId?: string;
  config: unknown;
  sql?: string;
};

export async function loader() {
  return Response.json(
    { error: 'GET method not supported. Use POST for driver commands.' },
    { status: 405 }
  );
}

export async function action({ request }: { request: Request }) {
  const logger = await getLogger();
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const body = (await request.json()) as DriverActionRequest;
    const { action, datasourceProvider, driverId, config, sql } = body;

    const dsMeta = DATASOURCES.find((ds) => ds.id === datasourceProvider);
    if (!dsMeta) {
      logger.error(
        {
          datasourceProvider,
          driverId,
        },
        'Datasource not found',
      );
      return Response.json({ error: 'Datasource not found' }, { status: 404 });
    }

    const driver =
      dsMeta.drivers.find((d) => d.id === driverId) ?? dsMeta.drivers[0];
    if (!driver) {
      logger.error(
        {
          datasourceProvider,
          driverId,
        },
        'Driver not found',
      );
      return Response.json({ error: 'Driver not found' }, { status: 404 });
    }

    if (driver.runtime !== 'node') {
      logger.error(
        {
          datasourceProvider,
          driverId,
        },
        'Driver is not node runtime for server execution',
      );
      return Response.json(
        { error: 'Driver is not node runtime for server execution' },
        { status: 400 },
      );
    }

    if (!config || typeof config !== 'object') {
      logger.error(
        {
          datasourceProvider,
          driverId,
          config,
        },
        'Driver config is required for server execution',
      );
      return Response.json(
        { error: 'Driver config is required for server execution' },
        { status: 400 },
      );
    }

    const instance = await getDriverInstance(driver as DiscoveredDriver);

    switch (action) {
      case 'testConnection': {
        await instance.testConnection(config);
        return Response.json({
          success: true,
          data: { connected: true, message: 'ok' },
        });
      }
      case 'metadata': {
        const metadata = await instance.metadata(config);
        return Response.json({ success: true, data: metadata });
      }
      case 'query': {
        if (!sql) {
          return Response.json({ error: 'Missing sql' }, { status: 400 });
        }
        const result = await instance.query(sql, config);
        return Response.json({ success: true, data: result });
      }
      default:
        return Response.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    logger.error({ error }, 'Error executing driver action');
    const message = formatError(error);
    console.error('[api/driver/command]', message);
    return Response.json({ error: message }, { status: 500 });
  }
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
