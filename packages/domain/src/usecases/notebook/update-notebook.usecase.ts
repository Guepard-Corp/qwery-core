import { NotebookOutput, UpdateNotebookInput } from '../dto';
import { UseCase } from '../usecase';

export type UpdateNotebookUseCase = UseCase<
  UpdateNotebookInput,
  NotebookOutput
>;
