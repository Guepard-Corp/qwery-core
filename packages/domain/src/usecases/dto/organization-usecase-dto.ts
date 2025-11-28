import { Exclude, Expose, plainToClass, Type } from 'class-transformer';
import { Organization } from '../../entities';

@Exclude()
export class OrganizationOutput {
  @Expose()
  public id!: string;
  @Expose()
  public name!: string;
  @Expose()
  public slug!: string;
  @Expose()
  public is_owner!: boolean;
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

  public static new(organization: Organization): OrganizationOutput {
    return plainToClass(OrganizationOutput, organization);
  }
}

export type CreateOrganizationInput = {
  name: string;
  is_owner: boolean;
  createdBy: string;
};

export type UpdateOrganizationInput = {
  id: string;
  name?: string;
  is_owner?: boolean;
  updatedBy?: string;
};
