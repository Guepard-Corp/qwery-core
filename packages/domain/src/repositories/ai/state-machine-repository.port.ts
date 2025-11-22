import { StateMachineDefinition } from '../../entities';
import { RepositoryPort } from '../base-repository.port';

export abstract class StateMachineRepositoryPort extends RepositoryPort<
  StateMachineDefinition,
  string
> {}
