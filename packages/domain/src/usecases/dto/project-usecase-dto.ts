import { Exclude, Expose, plainToClass, Type } from 'class-transformer';
import { Project } from '../../entities';

@Exclude()
export class ProjectOutput {
  @Expose()
  public id!: string;
  @Expose()
  public org_id!: string;
  @Expose()
  public name!: string;
  @Expose()
  public slug!: string;
  @Expose()
  public description!: string;
  @Expose()
  public status!: string;
  @Expose()
  @Type(() => Date)
  public createdAt!: Date;
  @Expose()
  @Type(() => Date)
  public updatedAt!: Date;
  @Expose()
  public createdBy!: string;
  @Expose()
  public updatedBy!: string;

  public static new(project: Project): ProjectOutput {
    return plainToClass(ProjectOutput, project);
  }
}

export type CreateProjectInput = {
  org_id: string;
  name: string;
  description?: string;
  createdBy: string;
};

export type UpdateProjectInput = {
  id: string;
  name?: string;
  description?: string;
  status?: string;
  updatedBy?: string;
};
