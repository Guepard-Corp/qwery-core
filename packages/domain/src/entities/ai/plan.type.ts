import { Entity } from '../../common/entity';
import { z } from 'zod';
import { Exclude, Expose } from 'class-transformer';

export const PlanSchema = z.object({
  id: z.uuid().describe('The unique identifier for the action'),
  name: z.string().min(1).max(255).describe('The name of the agent'),
  createdAt: z.date().describe('The date and time the agent was created'),
  updatedAt: z.date().describe('The date and time the agent was last updated'),
  createdBy: z.uuid().describe('The user who created the agent'),
  updatedBy: z.uuid().describe('The user who last updated the agent'),
});

export type Plan = z.infer<typeof PlanSchema>;

@Exclude()
export class PlanEntity extends Entity<string, typeof PlanSchema> {
  @Expose()
  declare public id: string;
  @Expose()
  public name!: string;
  @Expose()
  public createdAt!: Date;
  @Expose()
  public updatedAt!: Date;
}
