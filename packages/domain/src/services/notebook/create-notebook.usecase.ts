import { NotebookEntity } from '../../entities';
import { NotebookRepositoryPort } from '../../repositories';
import {
  CreateNotebookInput,
  NotebookOutput,
  CreateNotebookUseCase,
} from '../../usecases';

export class CreateNotebookService implements CreateNotebookUseCase {
  constructor(private readonly notebookRepository: NotebookRepositoryPort) {}

  public async execute(
    notebookDTO: CreateNotebookInput,
  ): Promise<NotebookOutput> {
    const newNotebook = NotebookEntity.create(notebookDTO);

    const notebook = await this.notebookRepository.create(newNotebook);
    return NotebookOutput.new(notebook);
  }
}
