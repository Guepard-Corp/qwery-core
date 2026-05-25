import type { IAgentRepository } from '@qwery/domain';

export interface DeleteAgentDeps {
  agentRepo: IAgentRepository;
}

export async function deleteAgent(deps: DeleteAgentDeps, id: string): Promise<boolean> {
  return deps.agentRepo.delete(id);
}
