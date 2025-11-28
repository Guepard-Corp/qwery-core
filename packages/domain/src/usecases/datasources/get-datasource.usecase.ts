import { UseCase } from '../usecase';
import { DatasourceOutput } from '../dto';

export type GetDatasourceUseCase = UseCase<string, DatasourceOutput>;

export type GetDatasourceBySlugUseCase = UseCase<string, DatasourceOutput>;
