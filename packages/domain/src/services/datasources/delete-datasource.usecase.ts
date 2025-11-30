import { Code } from '../../common/code';
import { DomainException } from '../../exceptions';
import { IDatasourceRepository } from '../../repositories';
import { DeleteDatasourceUseCase } from '../../usecases';

export class DeleteDatasourceService implements DeleteDatasourceUseCase {
  constructor(private readonly datasourceRepository: IDatasourceRepository) {}

  public async execute(id: string): Promise<boolean> {
    const datasource = await this.datasourceRepository.findById(id);
    if (!datasource) {
      throw DomainException.new({
        code: Code.DATASOURCE_NOT_FOUND_ERROR,
        overrideMessage: `Datasource with id '${id}' not found`,
        data: { datasourceId: id },
      });
    }
    return await this.datasourceRepository.delete(id);
  }
}
