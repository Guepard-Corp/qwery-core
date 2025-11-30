import { Code } from '../../common/code';
import { DomainException } from '../../exceptions';
import { IProjectRepository } from '../../repositories';
import {
  GetProjectBySlugUseCase,
  GetProjectUseCase,
  ProjectOutput,
} from '../../usecases';

export class GetProjectService implements GetProjectUseCase {
  constructor(private readonly projectRepository: IProjectRepository) {}

  public async execute(id: string): Promise<ProjectOutput> {
    const project = await this.projectRepository.findById(id);
    if (!project) {
      throw DomainException.new({
        code: Code.PROJECT_NOT_FOUND_ERROR,
        overrideMessage: `Project with id '${id}' not found`,
        data: { projectId: id },
      });
    }
    return ProjectOutput.new(project);
  }
}

export class GetProjectBySlugService implements GetProjectBySlugUseCase {
  constructor(private readonly projectRepository: IProjectRepository) {}

  public async execute(slug: string): Promise<ProjectOutput> {
    const project = await this.projectRepository.findBySlug(slug);
    if (!project) {
      throw DomainException.new({
        code: Code.PROJECT_NOT_FOUND_ERROR,
        overrideMessage: `Project with slug '${slug}' not found`,
        data: { projectSlug: slug },
      });
    }
    return ProjectOutput.new(project);
  }
}
