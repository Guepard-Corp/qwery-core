import { Organization, OrganizationEntity } from '../../entities';
import { OrganizationRepositoryPort } from '../../repositories';
import {
  CreateOrganizationInput,
  OrganizationOutput,
  CreateOrganizationUseCase,
} from '../../usecases';

export class CreateOrganizationService implements CreateOrganizationUseCase {
  constructor(
    private readonly organizationRepository: OrganizationRepositoryPort,
  ) {}

  public async execute(
    organizationDTO: CreateOrganizationInput,
  ): Promise<OrganizationOutput> {
    const newOrganization = OrganizationEntity.create(organizationDTO);
    const organization = await this.organizationRepository.create(
      newOrganization as unknown as Organization,
    );
    return OrganizationOutput.new(organization);
  }
}
