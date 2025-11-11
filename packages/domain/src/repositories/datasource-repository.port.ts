import { Datasource } from '../entities/datasource.type';
import { RepositoryPort } from './base-repository.port';

export abstract class DatasourceRepositoryPort extends RepositoryPort<
  Datasource,
  string
> {}
