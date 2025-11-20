import { Workspace } from '@qwery/domain/entities';
import { WorkspaceModeEnum } from '@qwery/domain/enums';
import { WorkspaceModeService } from '@qwery/domain/services';
import { isDesktopApp } from '@qwery/shared/desktop';

export class WorkspaceService extends WorkspaceModeService {
  public async detectWorkspaceMode(): Promise<WorkspaceModeEnum> {
    return isDesktopApp()
      ? WorkspaceModeEnum.DESKTOP
      : WorkspaceModeEnum.BROWSER;
  }

  async getWorkspace(port: Workspace): Promise<Workspace> {
    const mode = await this.execute();
    console.info(`Workspace mode: ${mode}`);

    switch (mode) {
      case WorkspaceModeEnum.DESKTOP:
        return port;
      case WorkspaceModeEnum.BROWSER:
      case WorkspaceModeEnum.CLI:
        return port;
      default:
        throw new Error(`Unknown workspace mode: ${mode}`);
    }
  }
}
