import { Project, ProjectEntity } from '../../entities';
import { IProjectRepository } from '../../repositories';
import {
  CreateProjectInput,
  CreateProjectUseCase,
  ProjectOutput,
} from '../../usecases';

export class CreateProjectService implements CreateProjectUseCase {
  constructor(private readonly projectRepository: IProjectRepository) {}

  public async execute(projectDTO: CreateProjectInput): Promise<ProjectOutput> {
    const newProject = ProjectEntity.create(projectDTO);
    const project = await this.projectRepository.create(
      newProject as unknown as Project,
    );
    return ProjectOutput.new(project);
  }
}
