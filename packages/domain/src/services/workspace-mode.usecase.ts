import { WorkspaceModeEnum } from '../enums/workspace-mode';
import { WorkspaceModeUseCase } from '../usecases/workspace-mode.usecase';

export abstract class WorkspaceModeService implements WorkspaceModeUseCase {
  public abstract detectWorkspaceMode(): Promise<WorkspaceModeEnum>;

  public async execute(): Promise<WorkspaceModeEnum> {
    const mode = await this.detectWorkspaceMode();

    if (!mode) {
      return WorkspaceModeEnum.BROWSER;
    }

    return mode;
  }
}
