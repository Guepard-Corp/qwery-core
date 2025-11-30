import { Code } from '../../common/code';
import { DomainException } from '../../exceptions';
import { DatasourceEntity, Datasource } from '../../entities';
import { IDatasourceRepository } from '../../repositories';
import { DatasourceOutput, UpdateDatasourceInput } from '../../usecases';
import { UpdateDatasourceUseCase } from '../../usecases';

export class UpdateDatasourceService implements UpdateDatasourceUseCase {
  constructor(private readonly datasourceRepository: IDatasourceRepository) {}

  public async execute(
    datasourceDTO: UpdateDatasourceInput,
  ): Promise<DatasourceOutput> {
    const existingDatasource = await this.datasourceRepository.findById(
      datasourceDTO.id,
    );
    if (!existingDatasource) {
      throw DomainException.new({
        code: Code.DATASOURCE_NOT_FOUND_ERROR,
        overrideMessage: `Datasource with id '${datasourceDTO.id}' not found`,
        data: { datasourceId: datasourceDTO.id },
      });
    }

    const newDatasource = DatasourceEntity.update(
      existingDatasource,
      datasourceDTO,
    );

    const datasource = await this.datasourceRepository.update(
      newDatasource as unknown as Datasource,
    );
    return DatasourceOutput.new(datasource);
  }
}
