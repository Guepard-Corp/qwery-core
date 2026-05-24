import { type DatasourceMetadata, type QuerySchema, toSimpleSchema } from '@qwery/domain';
import { tool } from 'ai';
import { z } from 'zod';
import type { Track } from './track';

/** Native driver-introspected schema for one attached datasource (or its error). */
export interface DatasourceSchemaInfo {
  datasourceId: string;
  datasourceName: string;
  metadata?: DatasourceMetadata;
  error?: string;
}

/**
 * Port the composition root implements (over the attached-datasources registry).
 * Returns native `driver.metadata()` introspection for every attached datasource.
 */
export interface DatasourceSchemaProvider {
  listSchemas(): Promise<DatasourceSchemaInfo[]>;
}

export interface SchemaToolDeps {
  track: Track;
  schemaProvider?: DatasourceSchemaProvider;
}

/** Flatten every table's columns into a single `table.column` list for the Results pane. */
function flattenForUi(infos: Array<{ datasourceName: string; metadata: DatasourceMetadata }>): QuerySchema {
  const columns = infos.flatMap(({ datasourceName, metadata }) => {
    const multiSource = infos.length > 1;
    return toSimpleSchema(metadata, datasourceName).flatMap((schema) =>
      schema.tables.flatMap((table) =>
        table.columns.map((col) => ({
          name: multiSource
            ? `${datasourceName}.${table.tableName}.${col.columnName}`
            : `${table.tableName}.${col.columnName}`,
          type: col.columnType,
        })),
      ),
    );
  });
  return { columns };
}

export function createSchemaTool(deps: SchemaToolDeps) {
  return tool({
    description:
      'Get the schema (tables, columns, data types) of the ATTACHED datasource(s) via their native drivers — NOT by running SQL. Call this BEFORE writing any query so you know what exists. detailLevel="simple" (default) returns tables + column types (token-efficient); "full" returns complete driver metadata (keys, relationships, …). Privacy-safe: no row data is exposed.',
    inputSchema: z.object({
      detailLevel: z
        .enum(['simple', 'full'])
        .default('simple')
        .describe('"simple" = tables + column types only; "full" = complete metadata.'),
    }),
    execute: async ({ detailLevel }) =>
      deps.track('schema', { detailLevel }, async () => {
        if (!deps.schemaProvider) {
          throw new Error('Schema introspection is not available (no provider configured).');
        }
        const results = await deps.schemaProvider.listSchemas();

        const ok: Array<{ datasourceName: string; metadata: DatasourceMetadata }> = [];
        const errors: Array<{ datasource: string; error: string }> = [];
        for (const r of results) {
          if (r.metadata) ok.push({ datasourceName: r.datasourceName, metadata: r.metadata });
          else errors.push({ datasource: r.datasourceName, error: r.error ?? 'unknown error' });
        }

        if (ok.length === 0) {
          const detail = errors.length
            ? errors.map((e) => `${e.datasource}: ${e.error}`).join('; ')
            : 'No datasources are attached — attach one via /datasources first.';
          throw new Error(`Could not load schema for any attached datasource. ${detail}`);
        }

        const target = ok.map((d) => d.datasourceName).join(', ');
        const ui = { kind: 'schema' as const, target, schema: flattenForUi(ok) };

        const llm =
          detailLevel === 'full'
            ? {
                ok: true as const,
                detailLevel: 'full' as const,
                datasources: ok.map((d) => ({ datasource: d.datasourceName, metadata: d.metadata })),
                ...(errors.length > 0 && { errors }),
              }
            : {
                ok: true as const,
                detailLevel: 'simple' as const,
                datasources: ok.map((d) => ({
                  datasource: d.datasourceName,
                  schemas: toSimpleSchema(d.metadata, d.datasourceName),
                })),
                ...(errors.length > 0 && { errors }),
              };

        return { ui, llm };
      }),
  });
}
