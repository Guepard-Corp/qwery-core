import { tool } from 'ai';
import { z } from 'zod';
import type { DatasourceSchemaProvider } from './schema';
import type { Track } from './track';

export interface ExpandSchemaToolDeps {
  track: Track;
  /** Native schema introspection over attached datasources. */
  schemaProvider?: DatasourceSchemaProvider;
}

export interface ExpandDatasourceResult {
  datasource: string;
  tables: Array<{ table: string; columns: Array<{ column: string; type: string }> }>;
}

/**
 * `expandSchema` tool — targeted schema reveal (Sprint 5 companion to
 * `searchSchema`). After the compact, query-ranked view from `searchSchema`,
 * the agent names the tables it still needs in full and gets every column of
 * just those tables — without dumping the entire catalog like `schema`. Any
 * requested table that doesn't exist is reported back in `missing`.
 *
 * Opt-in: with no schema provider it reports `available:false`.
 */
export function createExpandSchemaTool(deps: ExpandSchemaToolDeps) {
  return tool({
    description:
      'Reveal the FULL columns of specific tables by name (use after `searchSchema` when you need every column of a table it surfaced, or a table it did not). Cheaper than `schema` (which dumps everything). Returns the columns per requested table and lists any names that do not exist.',
    inputSchema: z.object({
      tables: z.array(z.string()).min(1).describe('Exact table names to expand.'),
    }),
    execute: async ({ tables }) =>
      deps.track('expandSchema', { tables }, async () => {
        const datasources: ExpandDatasourceResult[] = [];
        const found = new Set<string>();

        if (deps.schemaProvider) {
          const wanted = new Set(tables.map((t) => t.toLowerCase()));
          for (const r of await deps.schemaProvider.listSchemas()) {
            if (!r.metadata) {
              continue;
            }
            const byTable = new Map<string, Array<{ column: string; type: string }>>();
            for (const col of r.metadata.columns) {
              if (!wanted.has(col.table.toLowerCase())) {
                continue;
              }
              found.add(col.table.toLowerCase());
              const cols = byTable.get(col.table) ?? [];
              cols.push({ column: col.name, type: col.data_type });
              byTable.set(col.table, cols);
            }
            if (byTable.size > 0) {
              datasources.push({
                datasource: r.datasourceName,
                tables: [...byTable.entries()].map(([table, columns]) => ({ table, columns })),
              });
            }
          }
        }

        const available = Boolean(deps.schemaProvider);
        // `missing` is only meaningful when we could actually inspect the schema.
        const missing = available ? tables.filter((t) => !found.has(t.toLowerCase())) : [];
        return {
          ui: { kind: 'expandSchema' as const, available, requested: tables.length, found: found.size },
          llm: { ok: true as const, available, datasources, ...(missing.length > 0 && { missing }) },
        };
      }),
  });
}
