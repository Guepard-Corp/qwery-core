import { type OBQCRule, type OntologyProvider, validateQuery } from '@qwery/domain';
import { tool } from 'ai';
import { z } from 'zod';
import type { DatasourceSchemaProvider } from './schema';
import type { Track } from './track';

export interface ValidateQueryToolDeps {
  track: Track;
  /** Native schema introspection over attached datasources (for constraint extraction). */
  schemaProvider?: DatasourceSchemaProvider;
  /** Semantic-layer ontology port that derives OBQC constraint rules from metadata. */
  ontologyProvider?: OntologyProvider;
}

/**
 * `validateQuery` tool — OBQC pre-execution check (Sprint 8, Phase 1). Before
 * running a non-trivial SELECT, the agent submits its draft SQL; the tool
 * derives the OBQC constraint snapshot from the attached datasources' ontology
 * and flags hallucinated columns/tables, returning a repair prompt when invalid.
 *
 * Opt-in: when no ontology provider is wired the tool reports `available:false`
 * and passes (`valid:true`) — never blocking the agent.
 */
export function createValidateQueryTool(deps: ValidateQueryToolDeps) {
  return tool({
    description:
      "Validate a draft SQL query against the attached datasources' ontology BEFORE executing it. Catches references to columns or tables that do not exist (hallucinations). Returns valid=true/false and, when invalid, a repair hint listing the offending identifiers. Call this after drafting SQL and before runQuery/present.",
    inputSchema: z.object({
      sql: z.string().describe('The draft SQL query to validate.'),
    }),
    execute: async ({ sql }) =>
      deps.track('validateQuery', { sql }, async () => {
        if (!deps.schemaProvider || !deps.ontologyProvider) {
          return {
            ui: { kind: 'validateQuery' as const, sql, available: false, valid: true, violations: [] },
            llm: { ok: true as const, available: false, valid: true },
          };
        }

        const ontology = deps.ontologyProvider;
        const results = await deps.schemaProvider.listSchemas();
        const rules: OBQCRule[] = results.flatMap((r) =>
          r.metadata ? ontology.getConstraints(r.metadata) : [],
        );

        const result = validateQuery(sql, rules);
        return {
          ui: {
            kind: 'validateQuery' as const,
            sql,
            available: true,
            valid: result.valid,
            violations: result.violations,
          },
          llm: {
            ok: true as const,
            available: true,
            valid: result.valid,
            violations: result.violations,
            ...(result.repairPrompt && { repairPrompt: result.repairPrompt }),
          },
        };
      }),
  });
}
