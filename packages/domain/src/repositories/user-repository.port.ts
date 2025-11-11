import { User } from '../entities/user.type';
import { RepositoryPort } from './base-repository.port';

export abstract class UserRepositoryPort extends RepositoryPort<User, string> {}
