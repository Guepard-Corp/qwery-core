import { NotebookRepositoryPort } from '../../repositories';
import { GetNotebooksByProjectIdUseCase, NotebookOutput } from '../../usecases';

export class GetNotebooksByProjectIdService
  implements GetNotebooksByProjectIdUseCase
{
  constructor(private readonly notebookRepository: NotebookRepositoryPort) {}

  public async execute(projectId: string): Promise<NotebookOutput[]> {
    const notebooks = await this.notebookRepository.findByProjectId(projectId);
    if (!notebooks) {
      return [];
    }
    return notebooks.map((notebook) => NotebookOutput.new(notebook));
  }
}
