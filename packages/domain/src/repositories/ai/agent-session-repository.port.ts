import { AgentSession } from '../../entities';
import { RepositoryPort } from '../base-repository.port';

export abstract class IAgentSessionRepository extends RepositoryPort<
  AgentSession,
  string
> {}
