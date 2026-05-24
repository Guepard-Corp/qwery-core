import {
  updateSession as applyUpdate,
  Code,
  Exception,
  type ISessionRepository,
  type Session,
  type UpdateSessionInput,
} from '@qwery/domain';

export interface UpdateSessionDeps {
  sessionRepo: ISessionRepository;
}

export async function updateSession(
  deps: UpdateSessionDeps,
  id: string,
  input: UpdateSessionInput,
): Promise<Session> {
  const existing = await deps.sessionRepo.findById(id);
  if (!existing) {
    throw Exception.new({
      code: Code.ENTITY_NOT_FOUND_ERROR,
      overrideMessage: `Session ${id} not found`,
    });
  }
  const updated = applyUpdate(existing, input);
  return deps.sessionRepo.update(updated);
}
