import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

import { Entity } from '../common/entity';

export const ProjectSchema = z.object({
  id: z.string().uuid().describe('The unique identifier for the project'),
  org_id: z
    .string()
    .uuid()
    .describe('The unique identifier for the organisation'),
  name: z.string().min(1).max(255).describe('The name of the project'),
  slug: z.string().min(1).describe('The slug of the project'),
  description: z
    .string()
    .min(1)
    .max(1024)
    .describe('The description of the project'),
  region: z.string().min(1).max(255).describe('The region of the project'),
  status: z.string().min(1).max(255).describe('The status of the project'),
  createdAt: z.date().describe('The date and time the project was created'),
  updatedAt: z
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

export class ProjectEntity extends Entity<string, typeof ProjectSchema> {
  public id: string;
  public org_id: string;
  public name: string;
  public slug: string;
  public description: string;
  public region: string;
  public status: string;
  public createdAt: Date;
  public updatedAt: Date;
  public createdBy: string;
  public updatedBy: string;

  constructor(data: Project) {
    super(ProjectSchema, data.id);
    this.id = data.id;
    this.org_id = data.org_id;
    this.name = data.name;
    this.slug = data.slug;
    this.description = data.description;
    this.region = data.region;
    this.status = data.status;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.createdBy = data.createdBy;
    this.updatedBy = data.updatedBy;
  }

  protected getData(): Project {
    return {
      id: this.getId(),
      org_id: this.org_id,
      name: this.name,
      slug: this.slug,
      description: this.description,
      region: this.region,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      createdBy: this.createdBy,
      updatedBy: this.updatedBy,
    };
  }

  static new(
    data: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'updatedBy'>,
  ): ProjectEntity {
    const now = new Date();
    const project: Project = {
      id: uuidv4(),
      org_id: data.org_id,
      name: data.name,
      slug: data.slug,
      description: data.description,
      region: data.region,
      status: data.status,
      createdAt: now,
      updatedAt: now,
      createdBy: data.createdBy,
      updatedBy: data.createdBy,
    };
    return new ProjectEntity(project);
  }
}
