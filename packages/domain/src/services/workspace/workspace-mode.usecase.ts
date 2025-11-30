import { WorkspaceModeEnum } from '../../enums/workspace-mode';
import { SwitchWorkspaceModeUseCase } from '../../usecases/workspace/workspace-mode.usecase';

export abstract class SwitchWorkspaceModeService
  implements SwitchWorkspaceModeUseCase
{
  public abstract setWorkspaceMode(mode: WorkspaceModeEnum): Promise<void>;

  public async execute(mode: WorkspaceModeEnum): Promise<undefined> {
    await this.setWorkspaceMode(mode);
  }
}
