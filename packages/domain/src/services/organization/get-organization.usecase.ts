import { Code } from '../../common/code';
import { DomainException } from '../../exceptions';
import { IOrganizationRepository } from '../../repositories';
import {
  GetOrganizationBySlugUseCase,
  GetOrganizationUseCase,
  OrganizationOutput,
} from '../../usecases';

export class GetOrganizationService implements GetOrganizationUseCase {
  constructor(
    private readonly organizationRepository: IOrganizationRepository,
  ) {}

  public async execute(id: string): Promise<OrganizationOutput> {
    const organization = await this.organizationRepository.findById(id);
    if (!organization) {
      throw DomainException.new({
        code: Code.ORGANIZATION_NOT_FOUND_ERROR,
        overrideMessage: `Organization with id '${id}' not found`,
        data: { organizationId: id },
      });
    }
    return OrganizationOutput.new(organization);
  }
}

export class GetOrganizationBySlugService
  implements GetOrganizationBySlugUseCase
{
  constructor(
    private readonly organizationRepository: IOrganizationRepository,
  ) {}

  public async execute(id: string): Promise<OrganizationOutput> {
    const organization = await this.organizationRepository.findBySlug(id);
    if (!organization) {
      throw DomainException.new({
        code: Code.ORGANIZATION_NOT_FOUND_ERROR,
        overrideMessage: `Organization with id '${id}' not found`,
        data: { organizationId: id },
      });
    }
    return OrganizationOutput.new(organization);
  }
}
