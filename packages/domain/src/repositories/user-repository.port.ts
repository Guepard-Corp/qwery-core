import { User } from '../entities';
import { RepositoryPort } from './base-repository.port';

export abstract class IUserRepository extends RepositoryPort<User, string> {}
