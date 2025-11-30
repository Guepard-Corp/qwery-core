import {
  DatasourceOutput,
  UpdateDatasourceInput,
} from '../dto/datasource-usecase-dto';
import { UseCase } from '../usecase';

export type UpdateDatasourceUseCase = UseCase<
  UpdateDatasourceInput,
  DatasourceOutput
>;
