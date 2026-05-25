import {
  updateSession as applyUpdate,
  Code,
  Exception,
  type ISessionRepository,
  type Session,
} from '@qwery/domain';

export interface LinkDatasourceDeps {
  sessionRepo: ISessionRepository;
}

export interface LinkDatasourceInput {
  sessionId: string;
  datasourceId: string;
}

export async function linkDatasource(deps: LinkDatasourceDeps, input: LinkDatasourceInput): Promise<Session> {
  const existing = await deps.sessionRepo.findById(input.sessionId);
  if (!existing) {
    throw Exception.new({
      code: Code.ENTITY_NOT_FOUND_ERROR,
      overrideMessage: `Session ${input.sessionId} not found`,
    });
  }
  if (existing.datasources.includes(input.datasourceId)) return existing;
  const updated = applyUpdate(existing, {
    datasources: [...existing.datasources, input.datasourceId],
  });
  return deps.sessionRepo.update(updated);
}

export async function unlinkDatasource(
  deps: LinkDatasourceDeps,
  input: LinkDatasourceInput,
): Promise<Session> {
  const existing = await deps.sessionRepo.findById(input.sessionId);
  if (!existing) {
    throw Exception.new({
      code: Code.ENTITY_NOT_FOUND_ERROR,
      overrideMessage: `Session ${input.sessionId} not found`,
    });
  }
  if (!existing.datasources.includes(input.datasourceId)) return existing;
  const updated = applyUpdate(existing, {
    datasources: existing.datasources.filter((id) => id !== input.datasourceId),
  });
  return deps.sessionRepo.update(updated);
}
