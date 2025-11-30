import { Code } from '../../common/code';
import { DomainException } from '../../exceptions';
import { NotebookEntity } from '../../entities';
import { INotebookRepository } from '../../repositories';
import { UpdateNotebookInput, NotebookOutput } from '../../usecases/dto';
import { UpdateNotebookUseCase } from '../../usecases';

export class UpdateNotebookService implements UpdateNotebookUseCase {
  constructor(private readonly notebookRepository: INotebookRepository) {}

  public async execute(
    notebookDTO: UpdateNotebookInput,
  ): Promise<NotebookOutput> {
    const existingNotebook = await this.notebookRepository.findById(
      notebookDTO.id,
    );
    if (!existingNotebook) {
      throw DomainException.new({
        code: Code.NOTEBOOK_NOT_FOUND_ERROR,
        overrideMessage: `Notebook with id '${notebookDTO.id}' not found`,
        data: { notebookId: notebookDTO.id },
      });
    }

    const newNotebook = NotebookEntity.update(existingNotebook, notebookDTO);

    const notebook = await this.notebookRepository.update(newNotebook);
    return NotebookOutput.new(notebook);
  }
}
