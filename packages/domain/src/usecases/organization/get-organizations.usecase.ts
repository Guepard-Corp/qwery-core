import { OrganizationOutput } from '../dto/organization-usecase-dto';
import { UseCase } from '../usecase';

export type GetOrganizationsUseCase = UseCase<void, OrganizationOutput[]>;
