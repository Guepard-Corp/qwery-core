import { ProjectOutput, UpdateProjectInput } from '../dto/project-usecase-dto';
import { UseCase } from '../usecase';

export type UpdateProjectUseCase = UseCase<UpdateProjectInput, ProjectOutput>;
