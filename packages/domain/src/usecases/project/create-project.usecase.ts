import { CreateProjectInput, ProjectOutput } from '../dto/project-usecase-dto';
import { UseCase } from '../usecase';

export type CreateProjectUseCase = UseCase<CreateProjectInput, ProjectOutput>;
