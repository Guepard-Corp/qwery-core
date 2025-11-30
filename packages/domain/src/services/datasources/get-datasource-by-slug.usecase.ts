import { Code } from '../../common/code';
import { DomainException } from '../../exceptions';
import { IDatasourceRepository } from '../../repositories';
import {
  DatasourceOutput,
  GetDatasourceUseCase,
  GetDatasourceBySlugUseCase,
} from '../../usecases';

export class GetDatasourceService implements GetDatasourceUseCase {
  constructor(private readonly datasourceRepository: IDatasourceRepository) {}

  public async execute(id: string): Promise<DatasourceOutput> {
    const datasource = await this.datasourceRepository.findById(id);
    if (!datasource) {
      throw DomainException.new({
        code: Code.DATASOURCE_NOT_FOUND_ERROR,
        overrideMessage: `Datasource with id '${id}' not found`,
        data: { id },
      });
    }
    return DatasourceOutput.new(datasource);
  }
}

export class GetDatasourceBySlugService implements GetDatasourceBySlugUseCase {
  constructor(private readonly datasourceRepository: IDatasourceRepository) {}

  public async execute(slug: string): Promise<DatasourceOutput> {
    const datasource = await this.datasourceRepository.findBySlug(slug);
    if (!datasource) {
      throw DomainException.new({
        code: Code.DATASOURCE_NOT_FOUND_ERROR,
        overrideMessage: `Datasource with slug '${slug}' not found`,
        data: { slug },
      });
    }
    return DatasourceOutput.new(datasource);
  }
}
