import type { ISessionRepository } from '@qwery/domain';

export interface DeleteSessionDeps {
  sessionRepo: ISessionRepository;
}

export async function deleteSession(deps: DeleteSessionDeps, id: string): Promise<boolean> {
  return deps.sessionRepo.delete(id);
}
