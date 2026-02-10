import { Entity } from '../common/entity';
import { z } from 'zod';
import { Exclude, Expose, plainToClass, Type } from 'class-transformer';
import { generateIdentity } from '../utils/identity.generator';
import { CreateOrganizationInput, UpdateOrganizationInput } from '../usecases';

/**
 * Organization schema
 * Organization is the top level entity in the system. It is used to group projects and users.
 * This schema is used to validate the organization data
 */
export const OrganizationSchema = z.object({
  id: z.string().uuid().describe('The id of the organization'),
  name: z.string().describe('The name of the organization'),
  slug: z.string().min(1).describe('The slug of the organization'),
  userId: z
    .string()
    .uuid()
    .describe('The id of the user who is the owner of the organization'),

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

@Exclude()
export class OrganizationEntity extends Entity<
  string,
  typeof OrganizationSchema
> {
  @Expose()
  declare public id: string;
  @Expose()
  public name!: string;
  @Expose()
  public slug!: string;
  @Expose()
  public userId!: string;
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

  public static create(
    newOrganization: CreateOrganizationInput,
  ): OrganizationEntity {
    const { id, slug } = generateIdentity();
    const now = new Date();
    const organization: Organization = {
      id,
      name: newOrganization.name,
      slug,
      userId: newOrganization.userId,
      createdAt: now,
      updatedAt: now,
      createdBy: newOrganization.createdBy,
      updatedBy: newOrganization.createdBy,
    };

    return plainToClass(
      OrganizationEntity,
      OrganizationSchema.parse(organization),
    );
  }

  public static update(
    organization: Organization,
    organizationDTO: UpdateOrganizationInput,
  ): OrganizationEntity {
    const date = new Date();
    const updatedOrganization: Organization = {
      ...organization,
      ...(organizationDTO.name && { name: organizationDTO.name }),
      ...(organizationDTO.userId !== undefined && {
        userId: organizationDTO.userId,
      }),
      ...(organizationDTO.updatedBy && {
        updatedBy: organizationDTO.updatedBy,
      }),
      updatedAt: date,
    };

    return plainToClass(
      OrganizationEntity,
      OrganizationSchema.parse(updatedOrganization),
    );
  }
}
