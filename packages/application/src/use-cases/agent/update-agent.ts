import {
  type Agent,
  updateAgent as applyUpdate,
  Code,
  Exception,
  type IAgentRepository,
  type UpdateAgentInput,
} from '@qwery/domain';

export interface UpdateAgentDeps {
  agentRepo: IAgentRepository;
}

export async function updateAgent(
  deps: UpdateAgentDeps,
  id: string,
  input: UpdateAgentInput,
): Promise<Agent> {
  const existing = await deps.agentRepo.findById(id);
  if (!existing) {
    throw Exception.new({
      code: Code.ENTITY_NOT_FOUND_ERROR,
      overrideMessage: `Agent ${id} not found`,
    });
  }
  const updated = applyUpdate(existing, input);
  return deps.agentRepo.update(updated);
}
