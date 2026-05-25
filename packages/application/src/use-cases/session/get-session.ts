import type { ISessionRepository, RepositoryFindOptions, Session } from '@qwery/domain';

export interface SessionRepoDeps {
  sessionRepo: ISessionRepository;
}

export async function getSession(deps: SessionRepoDeps, id: string): Promise<Session | null> {
  return deps.sessionRepo.findById(id);
}

export async function getSessionBySlug(deps: SessionRepoDeps, slug: string): Promise<Session | null> {
  return deps.sessionRepo.findBySlug(slug);
}

export async function listSessions(
  deps: SessionRepoDeps,
  options?: RepositoryFindOptions,
): Promise<Session[]> {
  return deps.sessionRepo.findAll(options);
}

export async function listSessionsByDatasource(
  deps: SessionRepoDeps,
  datasourceId: string,
): Promise<Session[]> {
  return deps.sessionRepo.findByDatasourceId(datasourceId);
}

export async function listSessionsByProject(deps: SessionRepoDeps, projectId: string): Promise<Session[]> {
  return deps.sessionRepo.findByProjectId(projectId);
}
