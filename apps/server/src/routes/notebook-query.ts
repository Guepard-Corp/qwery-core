import { Hono } from 'hono';
import { getDatasourceDatabaseName } from '@qwery/agent-factory-sdk/tools/datasource-name-utils';
import {
  createQueryEngine,
  type AbstractQueryEngine,
} from '@qwery/domain/ports';
import { DuckDBQueryEngine } from '@qwery/agent-factory-sdk';
import { loadDatasources } from '@qwery/agent-factory-sdk/tools/datasource-loader';
import type { Repositories } from '@qwery/domain/repositories';
import { handleDomainException } from '../lib/http-utils';

function getWorkspaceDir(): string {
  return (
    process.env.WORKSPACE ??
    process.env.QWERY_WORKING_DIR ??
    process.env.WORKING_DIR ??
    '.'
  );
}

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

      const expectedDbName = getDatasourceDatabaseName(datasource);
      const queryEngine: AbstractQueryEngine =
        createQueryEngine(DuckDBQueryEngine);

      try {
        await queryEngine.initialize({
          workingDir: 'file://',
          config: {},
        });

        const workspaceDir = getWorkspaceDir();
        const loaded = await loadDatasources([datasourceId], repos.datasource);
        if (loaded.length > 0) {
          await queryEngine.attach(
            loaded.map((d) => d.datasource),
            { conversationId, workspace: workspaceDir },
          );
          await queryEngine.connect();
        } else {
          throw new Error(`Failed to load datasource ${datasourceId}`);
        }
      } catch (initError) {
        const errorMsg =
          initError instanceof Error ? initError.message : String(initError);
        return c.json(
          { error: `Failed to initialize query engine: ${errorMsg}` },
          500,
        );
      }

      let transformedQuery = query;
      if (datasource.datasource_provider === 'gsheet-csv') {
        const dbNamePattern = expectedDbName.replace(
          /[.*+?^${}()|[\]\\]/g,
          '\\$&',
        );
        transformedQuery = transformedQuery.replace(
          new RegExp(`"${dbNamePattern}"\\.main\\.`, 'gi'),
          `"${expectedDbName}".`,
        );
        transformedQuery = transformedQuery.replace(
          new RegExp(`\\b${dbNamePattern}\\.main\\.`, 'gi'),
          `${expectedDbName}.`,
        );
        if (/^show\s+tables;?\s*$/i.test(query)) {
          const escapedDbName = expectedDbName.replace(/'/g, "''");
          transformedQuery = `
            SELECT table_catalog AS database, table_schema AS schema, table_name AS name, table_type AS type
            FROM information_schema.tables
            WHERE table_catalog = '${escapedDbName}'
            ORDER BY table_schema, table_name
          `;
        }
      }

      try {
        const result = await queryEngine.query(transformedQuery);
        const headers = result.columns.map((col) => ({
          name: col.name,
          displayName: col.displayName,
          originalType: col.originalType,
        }));
        return c.json({
          success: true,
          data: { rows: result.rows, headers, stat: result.stat },
        });
      } catch (queryError) {
        const errorMessage =
          queryError instanceof Error ? queryError.message : String(queryError);
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
      } finally {
        try {
          await queryEngine.close();
        } catch {
          // ignore
        }
      }
    } catch (error) {
      return handleDomainException(error);
    }
  });

  return app;
}
