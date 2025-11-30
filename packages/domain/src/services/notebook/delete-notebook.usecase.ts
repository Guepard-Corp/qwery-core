import { Code } from '../../common/code';
import { DomainException } from '../../exceptions';
import { INotebookRepository } from '../../repositories';
import { DeleteNotebookUseCase } from '../../usecases';

export class DeleteNotebookService implements DeleteNotebookUseCase {
  constructor(private readonly notebookRepository: INotebookRepository) {}

  public async execute(id: string): Promise<boolean> {
    const notebook = await this.notebookRepository.findById(id);
    if (!notebook) {
      throw DomainException.new({
        code: Code.NOTEBOOK_NOT_FOUND_ERROR,
        overrideMessage: `Notebook with id '${id}' not found`,
        data: { notebookId: id },
      });
    }
    return await this.notebookRepository.delete(id);
  }
}
