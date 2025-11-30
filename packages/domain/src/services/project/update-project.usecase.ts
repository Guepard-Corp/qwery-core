import { Code } from '../../common/code';
import { DomainException } from '../../exceptions';
import { Project, ProjectEntity } from '../../entities';
import { IProjectRepository } from '../../repositories';
import {
  ProjectOutput,
  UpdateProjectInput,
  UpdateProjectUseCase,
} from '../../usecases';

export class UpdateProjectService implements UpdateProjectUseCase {
  constructor(private readonly projectRepository: IProjectRepository) {}

  public async execute(projectDTO: UpdateProjectInput): Promise<ProjectOutput> {
    const existingProject = await this.projectRepository.findById(
      projectDTO.id,
    );
    if (!existingProject) {
      throw DomainException.new({
        code: Code.PROJECT_NOT_FOUND_ERROR,
        overrideMessage: `Project with id '${projectDTO.id}' not found`,
        data: { projectId: projectDTO.id },
      });
    }

    const updatedProject = ProjectEntity.update(existingProject, projectDTO);
    const project = await this.projectRepository.update(
      updatedProject as unknown as Project,
    );
    return ProjectOutput.new(project);
  }
}
