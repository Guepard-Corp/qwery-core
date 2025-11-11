import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

import { Entity } from '../common/entity';

/**
 * Organization schema
 * Organization is the top level entity in the system. It is used to group projects and users.
 * This schema is used to validate the organization data
 */
export const OrganizationSchema = z.object({
  id: z.string().uuid().describe('The id of the organization'),
  name: z.string().describe('The name of the organization'),
  slug: z.string().min(1).describe('The slug of the organization'),
  is_owner: z
    .boolean()
    .describe('Whether the user is the owner of the organization'),

  // timestamps
  createdAt: z
    .date()
    .describe('The date and time the organization was created'),
  updatedAt: z
    .date()
    .describe('The date and time the organization was last updated'),
  createdBy: z
    .string()
    .min(1)
    .max(255)
    .describe('The user who created the organization'),
  updatedBy: z
    .string()
    .min(1)
    .max(255)
    .describe('The user who last updated the organization'),
});

export type Organization = z.infer<typeof OrganizationSchema>;

export class OrganizationEntity extends Entity<
  string,
  typeof OrganizationSchema
> {
  public id: string;
  public name: string;
  public slug: string;
  public is_owner: boolean;
  public createdAt: Date;
  public updatedAt: Date;
  public createdBy: string;
  public updatedBy: string;

  constructor(data: Organization) {
    super(OrganizationSchema, data.id);
    this.id = data.id;
    this.name = data.name;
    this.slug = data.slug;
    this.is_owner = data.is_owner;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.createdBy = data.createdBy;
    this.updatedBy = data.updatedBy;
  }

  protected getData(): Organization {
    return {
      id: this.getId(),
      name: this.name,
      slug: this.slug,
      is_owner: this.is_owner,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      createdBy: this.createdBy,
      updatedBy: this.updatedBy,
    };
  }

  static new(
    data: Omit<Organization, 'id' | 'createdAt' | 'updatedAt' | 'updatedBy'>,
  ): OrganizationEntity {
    const now = new Date();
    const organization: Organization = {
      id: uuidv4(),
      name: data.name,
      slug: data.slug,
      is_owner: data.is_owner,
      createdAt: now,
      updatedAt: now,
      createdBy: data.createdBy,
      updatedBy: data.createdBy,
    };
    return new OrganizationEntity(organization);
  }
}
