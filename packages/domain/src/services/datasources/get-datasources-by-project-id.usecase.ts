import { IDatasourceRepository } from '../../repositories';
import {
  DatasourceOutput,
  GetDatasourcesByProjectIdUseCase,
} from '../../usecases';

export class GetDatasourcesByProjectIdService
  implements GetDatasourcesByProjectIdUseCase
{
  constructor(private readonly datasourceRepository: IDatasourceRepository) {}

  public async execute(projectId: string): Promise<DatasourceOutput[]> {
    const datasources =
      await this.datasourceRepository.findByProjectId(projectId);
    if (!datasources) {
      return [];
    }
    return datasources.map((datasource) => DatasourceOutput.new(datasource));
  }
}
