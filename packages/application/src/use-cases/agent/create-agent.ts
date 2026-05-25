import {
  type Agent,
  createAgent as buildAgent,
  type CreateAgentInput,
  type IAgentRepository,
} from '@qwery/domain';

export interface CreateAgentDeps {
  agentRepo: IAgentRepository;
}

export async function createAgent(deps: CreateAgentDeps, input: CreateAgentInput): Promise<Agent> {
  const entity = buildAgent(input);
  return deps.agentRepo.create(entity);
}
