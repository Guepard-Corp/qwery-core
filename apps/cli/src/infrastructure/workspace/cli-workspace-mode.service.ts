import { WorkspaceRuntimeEnum } from '@qwery/domain/enums';
import { WorkspaceRuntimeService } from '@qwery/domain/services';

export class CliWorkspaceModeService extends WorkspaceRuntimeService {
  public async detectWorkspaceRuntime(): Promise<WorkspaceRuntimeEnum> {
    return WorkspaceRuntimeEnum.DESKTOP;
  }
}
