import { NotebookEntity } from '../../entities';
import { INotebookRepository } from '../../repositories';
import {
  CreateNotebookInput,
  NotebookOutput,
  CreateNotebookUseCase,
} from '../../usecases';

export class CreateNotebookService implements CreateNotebookUseCase {
  constructor(private readonly notebookRepository: INotebookRepository) {}

  public async execute(
    notebookDTO: CreateNotebookInput,
  ): Promise<NotebookOutput> {
    const newNotebook = NotebookEntity.create(notebookDTO);

    const notebook = await this.notebookRepository.create(newNotebook);
    return NotebookOutput.new(notebook);
  }
}
