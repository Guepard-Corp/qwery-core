import { IOrganizationRepository } from '../../repositories';
import { GetOrganizationsUseCase, OrganizationOutput } from '../../usecases';

export class GetOrganizationsService implements GetOrganizationsUseCase {
  constructor(
    private readonly organizationRepository: IOrganizationRepository,
  ) {}

  public async execute(): Promise<OrganizationOutput[]> {
    const organizations = await this.organizationRepository.findAll();
    return organizations.map((organization) =>
      OrganizationOutput.new(organization),
    );
  }
}
