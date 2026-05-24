import type { IUsageRepository, Usage } from '@qwery/domain';

export interface UsageRepoDeps {
  usageRepo: IUsageRepository;
}

export async function getUsage(deps: UsageRepoDeps, id: string): Promise<Usage | null> {
  return deps.usageRepo.findById(id);
}

export async function listUsageBySession(deps: UsageRepoDeps, sessionId: string): Promise<Usage[]> {
  return deps.usageRepo.findBySessionId(sessionId);
}
