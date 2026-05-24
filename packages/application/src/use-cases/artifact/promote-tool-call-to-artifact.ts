import {
  createQueryArtifact as buildQueryArtifact,
  type IArtifactRepository,
  type QueryArtifact,
  type ToolEvent,
} from '@qwery/domain';

export interface PromoteToolCallDeps {
  artifactRepo: IArtifactRepository;
}

export interface PromoteToolCallInput {
  toolEvent: ToolEvent;
  title: string;
  description?: string;
  tags?: string[];
  datasourceIds?: string[];
}

/**
 * Explicit promotion of a finished tool call (typically a `present` or `runQuery`)
 * into a persistent QueryArtifact. Implements decision U10 — save flow is explicit,
 * never automatic.
 */
export async function promoteToolCallToArtifact(
  deps: PromoteToolCallDeps,
  input: PromoteToolCallInput,
): Promise<QueryArtifact> {
  const { toolEvent, title, description, tags, datasourceIds } = input;
  if (toolEvent.status !== 'done' || !toolEvent.output || toolEvent.output.kind === 'error') {
    throw new Error('Only completed, non-error tool calls can be promoted to artifacts.');
  }
  const out = toolEvent.output;
  const sql = 'sql' in out ? out.sql : null;
  if (!sql) {
    throw new Error(`Tool '${toolEvent.name}' has no SQL to promote.`);
  }

  const artifact = buildQueryArtifact({
    title,
    description,
    tags,
    datasourceIds,
    sql,
  });
  await deps.artifactRepo.create(artifact);
  return artifact;
}
