import { z } from 'zod';
import { generateIdentity } from '../utils/identity.generator';

/**
 * Artifact — base abstraction for reusable analytical assets (ADR #26).
 *
 * Variants ship in MVP and via extensions:
 *   - `query`     : a saved SQL query (this MVP variant)
 *   - `report`    : composed of queries + narrative (extension, future)
 *   - `querybook` : ordered cells, notebook-style (extension, future)
 *   - `api`       : exposes a query as an HTTP endpoint (extension, future)
 *   - `app`       : composite UI (extension, future)
 *
 * Storage is project-scoped (`./.qwery/storage/artifact/<type>/<id>.json`, ADR #27),
 * one folder per type. Indexing for agent RAG reuse is keyword + tags in MVP
 * (ADR U11), embeddings later.
 */

export const ArtifactType = {
  QUERY: 'query',
} as const;

export type ArtifactType = (typeof ArtifactType)[keyof typeof ArtifactType];

const BaseArtifactSchema = z.object({
  id: z.uuid(),
  title: z.string().min(1).max(255),
  description: z.string().max(2048).default(''),
  tags: z.array(z.string().min(1)).default([]),
  datasourceIds: z.array(z.string().min(1)).default([]),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const QueryLastResultMetaSchema = z.object({
  rowCount: z.number().int().nonnegative(),
  durationMs: z.number().int().nonnegative(),
  runAt: z.date(),
});

export const QueryArtifactSchema = BaseArtifactSchema.extend({
  type: z.literal(ArtifactType.QUERY),
  sql: z.string().min(1).describe('SQL the artifact will execute (DuckDB dialect)'),
  lastResultMeta: QueryLastResultMetaSchema.optional(),
});

// Discriminated union — extend with .report/.querybook/.api/.app as extensions ship.
export const ArtifactSchema = z.discriminatedUnion('type', [QueryArtifactSchema]);

export type QueryArtifact = z.infer<typeof QueryArtifactSchema>;
export type Artifact = z.infer<typeof ArtifactSchema>;
export type QueryLastResultMeta = z.infer<typeof QueryLastResultMetaSchema>;

// --- Inputs ---

export const CreateQueryArtifactInputSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(2048).optional(),
  tags: z.array(z.string().min(1)).optional(),
  datasourceIds: z.array(z.string().min(1)).optional(),
  sql: z.string().min(1),
});
export type CreateQueryArtifactInput = z.infer<typeof CreateQueryArtifactInputSchema>;

export const UpdateQueryArtifactInputSchema = z
  .object({
    title: z.string().min(1).max(255),
    description: z.string().max(2048),
    tags: z.array(z.string().min(1)),
    datasourceIds: z.array(z.string().min(1)),
    sql: z.string().min(1),
  })
  .partial();
export type UpdateQueryArtifactInput = z.infer<typeof UpdateQueryArtifactInputSchema>;

// --- Factories ---

export function createQueryArtifact(input: CreateQueryArtifactInput): QueryArtifact {
  const { id } = generateIdentity();
  const now = new Date();
  return QueryArtifactSchema.parse({
    id,
    type: ArtifactType.QUERY,
    title: input.title,
    description: input.description ?? '',
    tags: input.tags ?? [],
    datasourceIds: input.datasourceIds ?? [],
    sql: input.sql,
    createdAt: now,
    updatedAt: now,
  });
}

export function updateQueryArtifact(current: QueryArtifact, input: UpdateQueryArtifactInput): QueryArtifact {
  return QueryArtifactSchema.parse({
    ...current,
    ...(input.title !== undefined && { title: input.title }),
    ...(input.description !== undefined && { description: input.description }),
    ...(input.tags !== undefined && { tags: input.tags }),
    ...(input.datasourceIds !== undefined && { datasourceIds: input.datasourceIds }),
    ...(input.sql !== undefined && { sql: input.sql }),
    updatedAt: new Date(),
  });
}

export function recordQueryRun(current: QueryArtifact, meta: QueryLastResultMeta): QueryArtifact {
  return QueryArtifactSchema.parse({ ...current, lastResultMeta: meta });
}
