import { Entity } from '../common/entity';
import { z } from 'zod/v3';
import { Exclude, Expose, plainToClass, Type } from 'class-transformer';
import { generateIdentity } from '../utils/identity.generator';
import { CreateDatasourceInput, UpdateDatasourceInput } from '../usecases';

export enum DatasourceKind {
  EMBEDDED = 'embedded',
  REMOTE = 'remote',
}

export const DatasourceSchema = z.object({
  id: z.string().uuid().describe('The unique identifier for the datasource'),
  projectId: z
    .string()
    .uuid()
    .describe('The unique identifier for the project'),
  name: z.string().min(1).max(255).describe('The name of the datasource'),
  description: z
    .string()
    .min(1)
    .max(1024)
    .describe('The description of the datasource'),
  slug: z.string().min(1).describe('The slug of the datasource'),
  datasource_provider: z
    .string()
    .min(1)
    .describe('The provider of the datasource'),
  datasource_driver: z.string().describe('The driver of the datasource'),
  datasource_kind: z
    .nativeEnum(DatasourceKind)
    .describe('The kind of the datasource'),
  config: z.object({}).passthrough(),
  createdAt: z.date().describe('The date and time the datasource was created'),
  updatedAt: z
    .date()
    .describe('The date and time the datasource was last updated'),
  createdBy: z.string().describe('The user who created the datasource'),
  updatedBy: z.string().describe('The user who last updated the datasource'),
  isPublic: z
    .boolean()
    .default(false)
    .describe('If true, this datasource is publicly viewable'),
  remixedFrom: z
    .string()
    .uuid()
    .optional()
    .nullable()
    .describe('If set, this datasource was remixed from another datasource'),
});

export type Datasource = z.infer<typeof DatasourceSchema>;

@Exclude()
export class DatasourceEntity extends Entity<string, typeof DatasourceSchema> {
  @Expose()
  declare public id: string;
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
  @Expose()
  public isPublic!: boolean;
  @Expose()
  public remixedFrom?: string | null;

  public static create(newDatasource: CreateDatasourceInput): DatasourceEntity {
    const { id, slug } = generateIdentity();
    const now = new Date();
    const datasource: Datasource = {
      id,
      projectId: newDatasource.projectId,
      name: newDatasource.name,
      slug,
      description: newDatasource.description || '',
      datasource_provider: newDatasource.datasource_provider,
      datasource_driver: newDatasource.datasource_driver,
      datasource_kind: newDatasource.datasource_kind as DatasourceKind,
      config: newDatasource.config || {},
      createdAt: now,
      updatedAt: now,
      createdBy: newDatasource.createdBy,
      updatedBy: newDatasource.createdBy,
      isPublic: false,
    };

    return plainToClass(DatasourceEntity, DatasourceSchema.parse(datasource));
  }

  public static update(
    datasource: Datasource,
    datasourceDTO: UpdateDatasourceInput,
  ): DatasourceEntity {
    const date = new Date();
    const updatedDatasource: Datasource = {
      ...datasource,
      ...(datasourceDTO.name && { name: datasourceDTO.name }),
      ...(datasourceDTO.description && {
        description: datasourceDTO.description,
      }),
      ...(datasourceDTO.datasource_provider && {
        datasource_provider: datasourceDTO.datasource_provider,
      }),
      ...(datasourceDTO.datasource_driver && {
        datasource_driver: datasourceDTO.datasource_driver,
      }),
      ...(datasourceDTO.datasource_kind && {
        datasource_kind: datasourceDTO.datasource_kind as DatasourceKind,
      }),
      ...(datasourceDTO.config && { config: datasourceDTO.config }),
      ...(datasourceDTO.updatedBy && { updatedBy: datasourceDTO.updatedBy }),
      updatedAt: date,
    };

    return plainToClass(
      DatasourceEntity,
      DatasourceSchema.parse(updatedDatasource),
    );
  }
}
