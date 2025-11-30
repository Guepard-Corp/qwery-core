import { WorkspaceInput, WorkspaceOutput } from '../dto';
import { UseCase } from '../usecase';

export type InitWorkspaceUseCase = UseCase<WorkspaceInput, WorkspaceOutput>;
