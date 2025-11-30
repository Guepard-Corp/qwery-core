import { Exclude, Expose, plainToClass, Type } from 'class-transformer';
import { Datasource, DatasourceKind } from '../../entities';

@Exclude()
export class DatasourceOutput {
  @Expose()
  public id!: string;
  @Expose()
  public projectId!: string;
  @Expose()
  public name!: string;
  @Expose()
  public description!: string;
  @Expose()
  public slug!: string;
  @Expose()
  public datasource_provider!: string;
  @Expose()
  public datasource_driver!: string;
  @Expose()
  public datasource_kind!: DatasourceKind;
  @Expose()
  public config!: Record<string, unknown>;
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

  public static new(datasource: Datasource): DatasourceOutput {
    return plainToClass(DatasourceOutput, datasource);
  }
}

export type CreateDatasourceInput = {
  projectId: string;
  name: string;
  description?: string;
  datasource_provider: string;
  datasource_driver: string;
  datasource_kind: string;
  config?: Record<string, unknown>;
  createdBy: string;
};

export type UpdateDatasourceInput = {
  id: string;
  name?: string;
  description?: string;
  datasource_provider?: string;
  datasource_driver?: string;
  datasource_kind?: string;
  config?: Record<string, unknown>;
  updatedBy?: string;
};
