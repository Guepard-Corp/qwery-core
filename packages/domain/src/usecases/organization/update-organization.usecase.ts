import {
  OrganizationOutput,
  UpdateOrganizationInput,
} from '../dto/organization-usecase-dto';
import { UseCase } from '../usecase';

export type UpdateOrganizationUseCase = UseCase<
  UpdateOrganizationInput,
  OrganizationOutput
>;
