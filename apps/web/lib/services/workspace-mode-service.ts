import { WorkspaceModeEnum } from '@qwery/domain/enums';
import { SwitchWorkspaceModeService } from '@qwery/domain/services';
import {
  getWorkspaceFromLocalStorage,
  setWorkspaceInLocalStorage,
} from '~/lib/workspace/workspace-helper';

export class WorkspaceModeService extends SwitchWorkspaceModeService {
  public async setWorkspaceMode(mode: WorkspaceModeEnum): Promise<void> {
    console.info(`Workspace mode: ${mode}`);
    const workspace = getWorkspaceFromLocalStorage();
    if (workspace) {
      workspace.mode = mode;
      setWorkspaceInLocalStorage(workspace);
    }
  }
}
