import { User } from '../entities';
import { RepositoryPort } from './base-repository.port';

export abstract class UserRepositoryPort extends RepositoryPort<User, string> {}
