import {
  ArtifactType,
  Code,
  type Compute,
  Exception,
  type IArtifactRepository,
  type QueryArtifact,
  type QueryResult,
  recordQueryRun,
} from '@qwery/domain';

export interface RunQueryArtifactDeps {
  artifactRepo: IArtifactRepository;
  compute: Compute;
}

export interface RunQueryArtifactResult {
  artifact: QueryArtifact;
  result: QueryResult;
}

/**
 * Re-execute a saved QueryArtifact and persist its updated `lastResultMeta`.
 * Used by the "Run" action on the Queries tab (ADR U9).
 */
export async function runQueryArtifact(
  deps: RunQueryArtifactDeps,
  id: string,
): Promise<RunQueryArtifactResult> {
  const existing = await deps.artifactRepo.findById(id);
  if (!existing || existing.type !== ArtifactType.QUERY) {
    throw Exception.new({
      code: Code.ENTITY_NOT_FOUND_ERROR,
      overrideMessage: `QueryArtifact ${id} not found`,
    });
  }
  const result = await deps.compute.runSql(existing.sql);
  const updated = recordQueryRun(existing, {
    rowCount: result.rowCount,
    durationMs: result.durationMs,
    runAt: new Date(),
  });
  await deps.artifactRepo.update(updated);
  return { artifact: updated, result };
}
