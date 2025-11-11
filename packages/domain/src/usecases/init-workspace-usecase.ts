import { WorkspaceUseCaseDto } from './dto/workspace-usecase-dto';
import { UseCase } from './usecase';

export type WorkspacePort = {
  userId: string;
  organizationId?: string;
  projectId?: string;
};

export type InitWorkspaceUseCase = UseCase<WorkspacePort, WorkspaceUseCaseDto>;
