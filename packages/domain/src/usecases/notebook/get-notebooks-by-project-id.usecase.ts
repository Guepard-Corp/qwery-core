import { NotebookOutput } from '../dto/notebook-usecase-dto';
import { UseCase } from '../usecase';

export type GetNotebooksByProjectIdUseCase = UseCase<string, NotebookOutput[]>;
