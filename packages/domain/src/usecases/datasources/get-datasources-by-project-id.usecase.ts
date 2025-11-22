import { DatasourceOutput } from '../dto';
import { UseCase } from '../usecase';

export type GetDatasourcesByProjectIdUseCase = UseCase<
  string,
  DatasourceOutput[]
>;
