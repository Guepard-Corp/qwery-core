import type { OntologyProvider, SchemaRetriever } from '@qwery/domain';
import { tool } from 'ai';
import { z } from 'zod';
import type { DatasourceSchemaProvider } from './schema';
import type { Track } from './track';

export interface SearchSchemaToolDeps {
  track: Track;
  /** Native schema introspection over attached datasources. */
  schemaProvider?: DatasourceSchemaProvider;
  /** Semantic-layer retriever that embeds columns and ranks them against the query. */
  schemaRetriever?: SchemaRetriever;
  /** Optional ontology port; when present, business-term → entity hints are added. */
  ontologyProvider?: OntologyProvider;
}

export interface SearchDatasourceResult {
  datasource: string;
  tables: Array<{ table: string; columns: Array<{ column: string; type: string; relevant: boolean }> }>;
  concepts?: Array<{ businessTerm: string; schemaEntity: string; description: string }>;
}

/**
 * `searchSchema` tool — query-aware schema retrieval (Sprint 2). Instead of
 * dumping the full catalog like `schema`, it returns only the columns relevant
 * to a natural-language query (plus their table-mates), and — when an ontology
 * provider is wired — business-term → entity concept hints. Use it to locate the
 * right columns on a wide schema before writing SQL.
 *
 * Opt-in: with no retriever wired it reports `available:false`; the agent should
 * fall back to the `schema` tool.
 */
export function createSearchSchemaTool(deps: SearchSchemaToolDeps) {
  return tool({
    description:
      'Find the schema columns relevant to a natural-language QUERY (semantic retrieval), instead of dumping every table like `schema`. Returns the most relevant tables/columns plus business-term → column hints when available. Use on wide schemas to locate the right columns before writing SQL.',
    inputSchema: z.object({
      query: z.string().describe('Natural-language description of what you are looking for.'),
      topK: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('How many top columns to seed retrieval (default 30).'),
    }),
    execute: async ({ query, topK }) =>
      deps.track('searchSchema', { query, topK }, async () => {
        const datasources: SearchDatasourceResult[] = [];
        let tableCount = 0;

        // Single result shape regardless of availability: an empty `datasources`
        // with `available:false` tells the agent to fall back to the `schema` tool.
        if (deps.schemaProvider && deps.schemaRetriever) {
          const retriever = deps.schemaRetriever;
          const ontology = deps.ontologyProvider;
          for (const r of await deps.schemaProvider.listSchemas()) {
            if (!r.metadata) {
              continue;
            }
            const tables = await retriever.retrieve(
              r.metadata,
              query,
              topK !== undefined ? { topK } : undefined,
            );
            tableCount += tables.length;
            const concepts = ontology ? ontology.getConcepts(r.metadata, query) : [];
            datasources.push({
              datasource: r.datasourceName,
              tables: tables.map((t) => ({
                table: t.table,
                columns: t.columns.map((c) => ({
                  column: c.column,
                  type: c.dataType,
                  relevant: c.directMatch,
                })),
              })),
              ...(concepts.length > 0 && {
                concepts: concepts.map((c) => ({
                  businessTerm: c.businessTerm,
                  schemaEntity: c.schemaEntity,
                  description: c.description,
                })),
              }),
            });
          }
        }

        const available = Boolean(deps.schemaProvider && deps.schemaRetriever);
        return {
          ui: { kind: 'searchSchema' as const, query, available, tables: tableCount },
          llm: { ok: true as const, available, datasources },
        };
      }),
  });
}
