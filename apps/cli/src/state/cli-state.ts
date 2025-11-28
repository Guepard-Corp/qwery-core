import type {
  Datasource,
  Notebook,
  Organization,
  Project,
  User,
  Workspace,
} from '@qwery/domain/entities';
import { WorkspaceModeEnum, WorkspaceRuntimeEnum } from '@qwery/domain/enums';

export const CLI_STATE_VERSION = 1;

export interface CliState {
  version: number;
  workspace: Workspace | null;
  users: User[];
  organizations: Organization[];
  projects: Project[];
  datasources: Datasource[];
  notebooks: Notebook[];
}

export function createInitialState(): CliState {
  return {
    version: CLI_STATE_VERSION,
    workspace: null,
    users: [],
    organizations: [],
    projects: [],
    datasources: [],
    notebooks: [],
  };
}

export function ensureWorkspaceMode(
  workspace: Workspace | null,
): Workspace | null {
  if (!workspace) {
    return null;
  }

  return {
    ...workspace,
    mode: WorkspaceModeEnum.SIMPLE,
    runtime: WorkspaceRuntimeEnum.DESKTOP,
  };
}
