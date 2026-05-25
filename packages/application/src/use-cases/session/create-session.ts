import {
  createSession as buildSession,
  type CreateSessionInput,
  type ISessionRepository,
  type Session,
} from '@qwery/domain';

export interface CreateSessionDeps {
  sessionRepo: ISessionRepository;
}

export async function createSession(deps: CreateSessionDeps, input: CreateSessionInput): Promise<Session> {
  const entity = buildSession(input);
  return deps.sessionRepo.create(entity);
}
