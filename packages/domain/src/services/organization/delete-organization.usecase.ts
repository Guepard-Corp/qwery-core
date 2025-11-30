import { Code } from '../../common/code';
import { DomainException } from '../../exceptions';
import { IOrganizationRepository } from '../../repositories';
import { DeleteOrganizationUseCase } from '../../usecases';

export class DeleteOrganizationService implements DeleteOrganizationUseCase {
  constructor(
    private readonly organizationRepository: IOrganizationRepository,
  ) {}

  public async execute(id: string): Promise<boolean> {
    const organization = await this.organizationRepository.findById(id);
    if (!organization) {
      throw DomainException.new({
        code: Code.ORGANIZATION_NOT_FOUND_ERROR,
        overrideMessage: `Organization with id '${id}' not found`,
        data: { organizationId: id },
      });
    }
    return await this.organizationRepository.delete(id);
  }
}
