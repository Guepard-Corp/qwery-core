import type { Agent } from '../entities/agent.entity';
import { RepositoryPort } from './base-repository';

export abstract class IAgentRepository extends RepositoryPort<Agent, string> {
  /** Find agents whose capabilities include the given tool name. */
  public abstract findByCapability(toolName: string): Promise<Agent[]>;
}
