import { WorkspaceRuntimeEnum } from '../../enums/workspace-mode';
import { WorkspaceRuntimeUseCase } from '../../usecases/workspace/workspace-runtime.usecase';

export abstract class WorkspaceRuntimeService
  implements WorkspaceRuntimeUseCase
{
  public abstract detectWorkspaceRuntime(): Promise<WorkspaceRuntimeEnum>;

  public async execute(): Promise<WorkspaceRuntimeEnum> {
    const runtime = await this.detectWorkspaceRuntime();

    if (!runtime) {
      return WorkspaceRuntimeEnum.BROWSER;
    }

    return runtime;
  }
}
