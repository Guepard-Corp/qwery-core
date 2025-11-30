import { Code } from '../../common/code';
import { DomainException } from '../../exceptions';
import { INotebookRepository } from '../../repositories';
import {
  GetNotebookBySlugUseCase,
  GetNotebookUseCase,
  NotebookOutput,
} from '../../usecases';

export class GetNotebookService implements GetNotebookUseCase {
  constructor(private readonly notebookRepository: INotebookRepository) {}

  public async execute(id: string): Promise<NotebookOutput> {
    const notebook = await this.notebookRepository.findById(id);
    if (!notebook) {
      throw DomainException.new({
        code: Code.NOTEBOOK_NOT_FOUND_ERROR,
        overrideMessage: `Notebook with id '${id}' not found`,
        data: { notebookId: id },
      });
    }
    return NotebookOutput.new(notebook);
  }
}

export class GetNotebookBySlugService implements GetNotebookBySlugUseCase {
  constructor(private readonly notebookRepository: INotebookRepository) {}

  public async execute(id: string): Promise<NotebookOutput> {
    const notebook = await this.notebookRepository.findBySlug(id);
    if (!notebook) {
      throw DomainException.new({
        code: Code.NOTEBOOK_NOT_FOUND_ERROR,
        overrideMessage: `Notebook with id '${id}' not found`,
        data: { notebookId: id },
      });
    }
    return NotebookOutput.new(notebook);
  }
}
