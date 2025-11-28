import { Project, ProjectEntity } from '../../entities';
import { ProjectRepositoryPort } from '../../repositories';
import {
  CreateProjectInput,
  CreateProjectUseCase,
  ProjectOutput,
} from '../../usecases';

export class CreateProjectService implements CreateProjectUseCase {
  constructor(private readonly projectRepository: ProjectRepositoryPort) {}

  public async execute(projectDTO: CreateProjectInput): Promise<ProjectOutput> {
    const newProject = ProjectEntity.create(projectDTO);
    const project = await this.projectRepository.create(
      newProject as unknown as Project,
    );
    return ProjectOutput.new(project);
  }
}
