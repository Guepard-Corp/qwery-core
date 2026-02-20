import { z } from 'zod';
import { Tool, type ToolContext, type ToolResult } from './tool';
import { RunQueryTool } from './run-query';
import { ExportFilenameSchema } from './schema';

const DESCRIPTION = `Run multiple SQL queries using the existing runQuery tool.
Each query is executed against the same datasource. Provide an exportFilename per query for table exports (e.g. machines-active-status).`;

const QueryItemSchema = z.object({
  id: z.string().optional(),
  query: z.string(),
  summary: z.string().optional(),
  exportFilename: ExportFilenameSchema.describe(
    "Short filename for this query's table export (lowercase, hyphens; e.g. machines-active-status)",
  ),
});

const RunQueryInputSchema = z.object({
  query: z.string(),
  datasourceId: z.string(),
  exportFilename: ExportFilenameSchema,
});

export const RunQueriesTool = Tool.define('runQueries', {
  description: DESCRIPTION,
  parameters: z.object({
    queries: z.array(QueryItemSchema).min(1),
  }),
  async execute(params, ctx) {
    const startTime = Date.now();

    const { attachedDatasources } = ctx.extra as {
      attachedDatasources: string[];
    };

    if (!attachedDatasources?.[0]) {
      throw new Error('No datasource attached');
    }

    const datasourceId = attachedDatasources[0];

    if (
      !('execute' in RunQueryTool) ||
      typeof RunQueryTool.execute !== 'function'
    ) {
      throw new Error('RunQueryTool does not have a valid execute function');
    }

    const results: Array<{
      id?: string;
      query: string;
      summary?: string;
      success: boolean;
      data?: unknown;
      error?: string;
    }> = [];

    for (const item of params.queries) {
      const { id, query, summary, exportFilename } = item;

      try {
        const input = RunQueryInputSchema.parse({
          query,
          datasourceId,
          exportFilename,
        });
        const data = await RunQueryTool.execute(input, ctx);

        results.push({
          id,
          query,
          summary,
          success: true,
          data,
        });
      } catch (error) {
        results.push({
          id,
          query,
          summary,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.length - succeeded;
    const durationMs = Date.now() - startTime;

    return {
      results,
      meta: {
        total: results.length,
        succeeded,
        failed,
        durationMs,
      },
    };
  },
});
