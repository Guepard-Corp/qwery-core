import { Entity } from '../../common/entity';
import { z } from 'zod';
import { Exclude, Expose } from 'class-transformer';

export const ActionSchema = z.object({
  id: z.uuid().describe('The unique identifier for the action'),
  name: z.string().min(1).max(255).describe('The name of the agent'),
  createdAt: z.date().describe('The date and time the agent was created'),
  updatedAt: z.date().describe('The date and time the agent was last updated'),
  createdBy: z.uuid().describe('The user who created the agent'),
  updatedBy: z.uuid().describe('The user who last updated the agent'),
});

export type Action = z.infer<typeof ActionSchema>;

@Exclude()
export class ActionEntity extends Entity<string, typeof ActionSchema> {
  @Expose()
  declare public id: string;
  @Expose()
  public name!: string;
  @Expose()
  public createdAt!: Date;
  @Expose()
  public updatedAt!: Date;
}
