import { IProjectRepository } from '../../repositories';
import { GetProjectsUseCase, ProjectOutput } from '../../usecases';

export class GetProjectsService implements GetProjectsUseCase {
  constructor(private readonly projectRepository: IProjectRepository) {}

  public async execute(): Promise<ProjectOutput[]> {
    const projects = await this.projectRepository.findAll();
    return projects.map((project) => ProjectOutput.new(project));
  }
}
