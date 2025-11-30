import { ProjectOutput } from '../dto/project-usecase-dto';
import { UseCase } from '../usecase';

export type GetProjectUseCase = UseCase<string, ProjectOutput>;

export type GetProjectBySlugUseCase = UseCase<string, ProjectOutput>;
