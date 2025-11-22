import {
  CreateOrganizationInput,
  OrganizationOutput,
} from '../dto/organization-usecase-dto';
import { UseCase } from '../usecase';

export type CreateOrganizationUseCase = UseCase<
  CreateOrganizationInput,
  OrganizationOutput
>;
