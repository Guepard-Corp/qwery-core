import type { Repositories } from '@qwery/domain/repositories';
import type { AbstractQueryEngine } from '@qwery/domain/ports';
import type { DatasourceOrchestrationResult } from './datasource-orchestration-service';
import type { PromptSource } from '../domain';
import type { ToolContext } from './tool';

export type ReadDataIntent = {
  intent: string;
  complexity: string;
  needsChart: boolean;
  needsSQL: boolean;
};

export type ReadDataToolExtra = {
  queryEngine: AbstractQueryEngine;
  repositories: Repositories;
  conversationId: string;
  orchestrationResult: DatasourceOrchestrationResult | null;
  metadataDatasources?: string[];
  promptSource?: PromptSource;
  intent?: ReadDataIntent;
};

export function getReadDataExtra(ctx: ToolContext): ReadDataToolExtra | null {
  const extra = ctx.extra as ReadDataToolExtra | undefined;
  if (
    !extra ||
    !extra.queryEngine ||
    !extra.repositories ||
    extra.conversationId === undefined
  ) {
    return null;
  }
  return extra;
}

export function getWorkspace(ctx: ToolContext): string {
  const extra = getReadDataExtra(ctx);
  const workspace =
    extra?.orchestrationResult?.workspace ??
    (typeof process !== 'undefined' && process?.env?.WORKSPACE);
  if (!workspace) {
    throw new Error('WORKSPACE environment variable is not set');
  }
  return workspace;
}

export function getOrchestration(
  ctx: ToolContext,
): DatasourceOrchestrationResult | null {
  return getReadDataExtra(ctx)?.orchestrationResult ?? null;
}
