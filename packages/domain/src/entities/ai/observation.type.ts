import { Entity } from '../../common/entity';
import { z } from 'zod/v3';
import { Exclude, Expose } from 'class-transformer';

export const ObservationSchema = z.object({
  id: z.string().uuid().describe('The unique identifier for the action'),
  name: z.string().min(1).max(255).describe('The name of the agent'),
  createdAt: z.date().describe('The date and time the agent was created'),
  updatedAt: z.date().describe('The date and time the agent was last updated'),
  createdBy: z.string().describe('The user who created the agent'),
  updatedBy: z.string().describe('The user who last updated the agent'),
});

export type Observation = z.infer<typeof ObservationSchema>;

@Exclude()
export class ObservationEntity extends Entity<
  string,
  typeof ObservationSchema
> {
  @Expose()
  declare public id: string;
  @Expose()
  public name!: string;
  @Expose()
  public createdAt!: Date;
  @Expose()
  public updatedAt!: Date;
}
