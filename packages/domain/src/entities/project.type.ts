import { Entity } from '../common/entity';
import { z } from 'zod';
import { Exclude, Expose, plainToClass, Type } from 'class-transformer';
import { generateIdentity } from '../utils/identity.generator';
import { CreateProjectInput, UpdateProjectInput } from '../usecases';

export const ProjectSchema = z.object({
  id: z.uuid().describe('The unique identifier for the project'),
  organizationId: z
    .string()
    .uuid()
    .describe('The unique identifier for the organisation'),
  name: z.string().min(1).max(255).describe('The name of the project'),
  slug: z.string().min(1).describe('The slug of the project'),
  description: z
    .string()
    .max(1024)
    .optional()
    .describe('The description of the project'),
  status: z
    .string()
    .min(1)
    .max(255)
    .optional()
    .describe('The status of the project'),
  createdAt: z.coerce
    .date()
    .describe('The date and time the project was created'),
  updatedAt: z.coerce
    .date()
    .describe('The date and time the project was last updated'),
  createdBy: z
    .string()
    .min(1)
    .max(255)
    .describe('The user who created the project'),
  updatedBy: z
    .string()
    .min(1)
    .max(255)
    .describe('The user who last updated the project'),
});

export type Project = z.infer<typeof ProjectSchema>;

@Exclude()
export class ProjectEntity extends Entity<string, typeof ProjectSchema> {
  @Expose()
  declare public id: string;
  @Expose()
  public organizationId!: string;
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

  public static create(newProject: CreateProjectInput): ProjectEntity {
    const { id, slug } = generateIdentity();
    const now = new Date();
    const project: Project = {
      id,
      organizationId: newProject.organizationId,
      name: newProject.name,
      slug,
      description: newProject.description,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      createdBy: newProject.createdBy,
      updatedBy: newProject.createdBy,
    };

    return plainToClass(ProjectEntity, ProjectSchema.parse(project));
  }

  public static update(
    project: Project,
    projectDTO: UpdateProjectInput,
  ): ProjectEntity {
    const date = new Date();
    const updatedProject: Project = {
      ...project,
      ...(projectDTO.name && { name: projectDTO.name }),
      ...(projectDTO.description !== undefined && {
        description: projectDTO.description,
      }),
      ...(projectDTO.status && { status: projectDTO.status }),
      ...(projectDTO.updatedBy && { updatedBy: projectDTO.updatedBy }),
      updatedAt: date,
    };

    return plainToClass(ProjectEntity, ProjectSchema.parse(updatedProject));
  }
}
