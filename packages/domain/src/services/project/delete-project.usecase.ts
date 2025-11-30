import { Code } from '../../common/code';
import { DomainException } from '../../exceptions';
import { IProjectRepository } from '../../repositories';
import { DeleteProjectUseCase } from '../../usecases';

export class DeleteProjectService implements DeleteProjectUseCase {
  constructor(private readonly projectRepository: IProjectRepository) {}

  public async execute(id: string): Promise<boolean> {
    const project = await this.projectRepository.findById(id);
    if (!project) {
      throw DomainException.new({
        code: Code.PROJECT_NOT_FOUND_ERROR,
        overrideMessage: `Project with id '${id}' not found`,
        data: { projectId: id },
      });
    }
    return await this.projectRepository.delete(id);
  }
}
