import { NotebookOutput } from '../dto/notebook-usecase-dto';
import { UseCase } from '../usecase';

export type GetNotebookUseCase = UseCase<string, NotebookOutput>;

export type GetNotebookBySlugUseCase = UseCase<string, NotebookOutput>;
