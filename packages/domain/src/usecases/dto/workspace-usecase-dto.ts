import 'reflect-metadata';
import { Exclude, Expose, plainToClass } from 'class-transformer';
import type { UserOutput } from './user-usecase-dto';
import type {
  WorkspaceMode,
  WorkspaceRuntime,
  Organization,
  Project,
} from '../../entities';

export interface WorkspaceInput {
  userId: string;
  organizationId?: string;
  projectId?: string;
  mode?: string;
}

@Exclude()
export class WorkspaceOutput {
  @Expose()
  public user!: UserOutput;

  @Expose()
  public organization?: Organization;

  @Expose()
  public project?: Project;

  @Expose()
  public permissions?: string[];

  @Expose()
  public mode!: WorkspaceMode;

  @Expose()
  public runtime!: WorkspaceRuntime;

  @Expose()
  public isAnonymous!: boolean;

  public static new(data: {
    user: UserOutput;
    organization?: Organization;
    project?: Project;
    permissions?: string[];
    mode: WorkspaceMode;
    runtime: WorkspaceRuntime;
    isAnonymous: boolean;
  }): WorkspaceOutput {
    return plainToClass(WorkspaceOutput, data);
  }
}
