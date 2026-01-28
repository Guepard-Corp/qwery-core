import { getDatasourceDatabaseName } from '@qwery/agent-factory-sdk/tools/datasource-name-utils';
import {
  createQueryEngine,
  type AbstractQueryEngine,
} from '@qwery/domain/ports';
import { DuckDBQueryEngine } from '@qwery/agent-factory-sdk';
import type { ActionFunctionArgs } from 'react-router';
import { createRepositories } from '~/lib/repositories/repositories-factory';
import { handleDomainException } from '~/lib/utils/error-handler';
import { recordQueryMetrics } from '@qwery/telemetry/otel/utils';
import { getWebTelemetry } from '~/lib/telemetry-instance';

const repositories = await createRepositories();

function resolveWorkspaceDir(): string | undefined {
  const globalProcess =
    typeof globalThis !== 'undefined'
      ? (globalThis as { process?: NodeJS.Process }).process
      : undefined;
  const envValue =
    globalProcess?.env?.WORKSPACE ??
    globalProcess?.env?.VITE_WORKING_DIR ??
    globalProcess?.env?.WORKING_DIR;
  if (envValue) {
    return envValue;
  }

  try {
    return (import.meta as { env?: Record<string, string> })?.env
      ?.VITE_WORKING_DIR;
  } catch {
    return undefined;
  }
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await request.json();
    const { conversationId, query, datasourceId } = body;

    if (!conversationId || !query || !datasourceId) {
      return Response.json(
        {
          error: 'Missing required fields: conversationId, query, datasourceId',
        },
        { status: 400 },
      );
    }

    const workspaceDir = resolveWorkspaceDir();
    if (!workspaceDir) {
      return Response.json(
        {
          error:
            'WORKSPACE environment variable is not set. Google Sheets datasources require WORKSPACE for persistent DuckDB attachment.',
        },
        { status: 500 },
      );
    }

    // Load datasource to get its name and verify it exists
    const datasource = await repositories.datasource.findById(datasourceId);
    if (!datasource) {
      return Response.json(
        { error: `Datasource ${datasourceId} not found` },
        { status: 404 },
      );
    }

    // Get expected database name (what the agent uses in queries)
    const expectedDbName = getDatasourceDatabaseName(datasource);
    console.log('[Notebook Query API] Datasource info:', {
      id: datasourceId,
      name: datasource.name,
      expectedDbName,
      provider: datasource.datasource_provider,
    });

    // Dynamically import loadDatasources using package export
    const { loadDatasources } = await import(
      '@qwery/agent-factory-sdk/tools/datasource-loader'
    );

    // Create and initialize queryEngine (aligned with main's architecture)
    const queryEngine: AbstractQueryEngine =
      createQueryEngine(DuckDBQueryEngine);

    try {
      await queryEngine.initialize({
        workingDir: 'file://', // In-memory instance
        config: {},
      });

      const loaded = await loadDatasources(
        [datasourceId],
        repositories.datasource,
      );
      if (loaded.length > 0) {
        await queryEngine.attach(
          loaded.map(
            (d: { datasource: import('@qwery/domain/entities').Datasource }) =>
              d.datasource,
          ),
          {
            conversationId,
            workspace: workspaceDir,
          },
        );
        await queryEngine.connect();
        console.log(
          '[Notebook Query API] Query engine initialized and datasource attached',
        );
      } else {
        throw new Error(`Failed to load datasource ${datasourceId}`);
      }
    } catch (initError) {
      const errorMsg =
        initError instanceof Error ? initError.message : String(initError);
      console.error(
        '[Notebook Query API] Failed to initialize query engine:',
        errorMsg,
      );
      return Response.json(
        { error: `Failed to initialize query engine: ${errorMsg}` },
        { status: 500 },
      );
    }

    // Transform query for Google Sheets:
    // 1) remove .main. schema references (agent uses db.main.table, actual is db.table)
    // 2) normalize SHOW TABLES to an explicit DuckDB information_schema query scoped to this datasource db
    let transformedQuery = query;
    if (datasource.datasource_provider === 'gsheet-csv') {
      // Replace "dbname.main.tablename" with "dbname.tablename"
      // Handle both quoted and unquoted database names
      const dbNamePattern = expectedDbName.replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&',
      );

      // Pattern 1: "dbname.main.tablename" -> "dbname"."tablename"
      // This handles the case where the agent generates: "happy_moon_2l7piw.main.drivers"
      transformedQuery = transformedQuery.replace(
        new RegExp(`"${dbNamePattern}"\\.main\\.`, 'gi'),
        `"${expectedDbName}".`,
      );

      // Pattern 2: dbname.main.tablename -> dbname.tablename (unquoted)
      transformedQuery = transformedQuery.replace(
        new RegExp(`\\b${dbNamePattern}\\.main\\.`, 'gi'),
        `${expectedDbName}.`,
      );

      // Special-case SHOW TABLES to scope it to this datasource's catalog using DuckDB itself
      if (/^show\s+tables;?\s*$/i.test(query)) {
        const escapedDbName = expectedDbName.replace(/'/g, "''");
        transformedQuery = `
          SELECT 
            table_catalog AS database,
            table_schema AS schema,
            table_name AS name,
            table_type AS type
          FROM information_schema.tables
          WHERE table_catalog = '${escapedDbName}'
          ORDER BY table_schema, table_name
        `;
      }

      if (transformedQuery !== query) {
        console.log(
          '[Notebook Query API] Transformed query for Google Sheets:',
          {
            original: query,
            transformed: transformedQuery,
          },
        );
      }
    }

    try {
      const startTime = Date.now();
      let result;
      try {
        result = await queryEngine.query(transformedQuery);
      } catch (queryError) {
        // If query fails with database not found error, provide helpful message
        const errorMessage =
          queryError instanceof Error ? queryError.message : String(queryError);
        if (
          errorMessage.includes('does not exist') ||
          errorMessage.includes('Catalog Error')
        ) {
          const helpfulError =
            `Query failed: ${errorMessage}\n\n` +
            `Expected database name: "${expectedDbName}"\n` +
            `Datasource name: "${datasource.name}"\n` +
            `If the query uses a different database or table name, it may need to be updated to match the actual names.`;
          console.error(
            '[Notebook Query API] Query execution failed:',
            helpfulError,
          );
          return Response.json({ error: helpfulError }, { status: 400 });
        }
        throw queryError;
      }

      const duration = Date.now() - startTime;
      const rowCount = result.rows.length;

      // Record query metrics
      try {
        const telemetry = await getWebTelemetry();
        // Extract workspace context from conversation if available
        let workspace;

        try {
          const conversation =
            await repositories.conversation.findBySlug(conversationId);
          if (conversation) {
            // Fetch project to get organizationId
            const project = await repositories.project.findById(
              conversation.projectId,
            );
            workspace = {
              userId: conversation.createdBy,
              organizationId: project?.organizationId,
              projectId: conversation.projectId,
            };
          }
        } catch {
          // Ignore errors when extracting workspace context
        }

        recordQueryMetrics(telemetry, 'web', workspace, duration, rowCount, {
          'datasource.id': datasourceId,
          'conversation.id': conversationId,
          'query.mode': 'notebook',
        });
      } catch (metricsError) {
        // Don't fail the request if metrics recording fails
        console.warn(
          '[Notebook Query API] Failed to record metrics:',
          metricsError,
        );
      }

      const headers = result.columns.map((col) => ({
        name: col.name,
        displayName: col.displayName,
        originalType: col.originalType,
      }));

      return Response.json({
        success: true,
        data: {
          rows: result.rows,
          headers,
          stat: result.stat,
        },
      });
    } finally {
      try {
        await queryEngine.close();
      } catch (closeError) {
        console.warn(
          '[Notebook Query API] Failed to close query engine:',
          closeError,
        );
      }
    }
  } catch (error) {
    return handleDomainException(error);
  }
}
