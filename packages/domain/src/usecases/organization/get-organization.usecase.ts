import { OrganizationOutput } from '../dto/organization-usecase-dto';
import { UseCase } from '../usecase';

export type GetOrganizationUseCase = UseCase<string, OrganizationOutput>;

export type GetOrganizationBySlugUseCase = UseCase<string, OrganizationOutput>;
