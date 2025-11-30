import { Workspace } from '@qwery/domain/entities';
import { WorkspaceRuntimeEnum } from '@qwery/domain/enums';
import { WorkspaceRuntimeService } from '@qwery/domain/services';
import { isDesktopApp } from '@qwery/shared/desktop';

export class WorkspaceService extends WorkspaceRuntimeService {
  public async detectWorkspaceRuntime(): Promise<WorkspaceRuntimeEnum> {
    return isDesktopApp()
      ? WorkspaceRuntimeEnum.DESKTOP
      : WorkspaceRuntimeEnum.BROWSER;
  }

  async getWorkspace(port: Workspace): Promise<Workspace> {
    const runtime = await this.execute();
    console.info(`Workspace runtime: ${runtime}`);

    switch (runtime) {
      case WorkspaceRuntimeEnum.DESKTOP:
        return port;
      case WorkspaceRuntimeEnum.BROWSER:
        return port;
      default:
        throw new Error(`Unknown workspace runtime: ${runtime}`);
    }
  }
}
