import { StateMachineDefinition } from '../../entities';
import { RepositoryPort } from '../base-repository.port';

export abstract class IStateMachineRepository extends RepositoryPort<
  StateMachineDefinition,
  string
> {}
