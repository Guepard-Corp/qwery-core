import { ProjectRepositoryPort } from '../../repositories';
import { GetProjectsUseCase, ProjectOutput } from '../../usecases';

export class GetProjectsService implements GetProjectsUseCase {
  constructor(private readonly projectRepository: ProjectRepositoryPort) {}

  public async execute(): Promise<ProjectOutput[]> {
    const projects = await this.projectRepository.findAll();
    return projects.map((project) => ProjectOutput.new(project));
  }
}
