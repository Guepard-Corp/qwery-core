import 'reflect-metadata';
import { Exclude, Expose, plainToClass } from 'class-transformer';
import type { Organization } from '../../entities/organization.type';
import type { Project } from '../../entities/project.type';
import type { UserUseCaseDto } from './user-usecase-dto';
import type { WorkspaceMode } from '../../entities/workspace.type';

@Exclude()
export class WorkspaceUseCaseDto {
  @Expose()
  public user!: UserUseCaseDto;

  @Expose()
  public organization?: Organization;

  @Expose()
  public project?: Project;

  @Expose()
  public permissions?: string[];

  @Expose()
  public mode!: WorkspaceMode;

  @Expose()
  public isAnonymous!: boolean;

  public static new(data: {
    user: UserUseCaseDto;
    organization?: Organization;
    project?: Project;
    permissions?: string[];
    mode: WorkspaceMode;
    isAnonymous: boolean;
  }): WorkspaceUseCaseDto {
    return plainToClass(WorkspaceUseCaseDto, data);
  }
}
