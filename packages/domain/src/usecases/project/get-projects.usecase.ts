import { ProjectOutput } from '../dto/project-usecase-dto';
import { UseCase } from '../usecase';

export type GetProjectsUseCase = UseCase<void, ProjectOutput[]>;
