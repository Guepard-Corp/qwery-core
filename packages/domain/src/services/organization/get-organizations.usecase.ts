import { OrganizationRepositoryPort } from '../../repositories';
import { GetOrganizationsUseCase, OrganizationOutput } from '../../usecases';

export class GetOrganizationsService implements GetOrganizationsUseCase {
  constructor(
    private readonly organizationRepository: OrganizationRepositoryPort,
  ) {}

  public async execute(): Promise<OrganizationOutput[]> {
    const organizations = await this.organizationRepository.findAll();
    return organizations.map((organization) =>
      OrganizationOutput.new(organization),
    );
  }
}
