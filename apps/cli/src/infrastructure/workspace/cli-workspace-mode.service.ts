import { WorkspaceModeEnum } from '@qwery/domain/enums';
import { WorkspaceModeService } from '@qwery/domain/services';

export class CliWorkspaceModeService extends WorkspaceModeService {
  public async detectWorkspaceMode(): Promise<WorkspaceModeEnum> {
    return WorkspaceModeEnum.DESKTOP;
  }
}
