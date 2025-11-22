import { WorkspaceRuntimeEnum } from '../../enums/workspace-mode';
import { WorkspaceRuntimeUseCase } from '../../usecases/workspace/workspace-runtime.usecase';

export abstract class WorkspaceRuntimeService
  implements WorkspaceRuntimeUseCase
{
  public abstract detectWorkspaceRuntime(): Promise<WorkspaceRuntimeEnum>;

  public async execute(): Promise<WorkspaceRuntimeEnum> {
    const mode = await this.detectWorkspaceRuntime();

    if (!mode) {
      return WorkspaceRuntimeEnum.BROWSER;
    }

    return mode;
  }
}
