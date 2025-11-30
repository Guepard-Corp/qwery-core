import {
  CreateNotebookInput,
  NotebookOutput,
} from '../dto/notebook-usecase-dto';
import { UseCase } from '../usecase';

export type CreateNotebookUseCase = UseCase<
  CreateNotebookInput,
  NotebookOutput
>;
