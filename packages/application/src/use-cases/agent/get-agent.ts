import type { Agent, IAgentRepository, RepositoryFindOptions } from '@qwery/domain';

export interface AgentRepoDeps {
  agentRepo: IAgentRepository;
}

export async function getAgent(deps: AgentRepoDeps, id: string): Promise<Agent | null> {
  return deps.agentRepo.findById(id);
}

export async function getAgentBySlug(deps: AgentRepoDeps, slug: string): Promise<Agent | null> {
  return deps.agentRepo.findBySlug(slug);
}

export async function listAgents(deps: AgentRepoDeps, options?: RepositoryFindOptions): Promise<Agent[]> {
  return deps.agentRepo.findAll(options);
}

export async function listAgentsByCapability(deps: AgentRepoDeps, toolName: string): Promise<Agent[]> {
  return deps.agentRepo.findByCapability(toolName);
}
