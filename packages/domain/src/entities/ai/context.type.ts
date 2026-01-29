import { Entity } from '../../common/entity';
import { z } from 'zod/v3';
import { Exclude, Expose } from 'class-transformer';

export const ContextSchema = z.object({
  id: z.string().uuid().describe('The unique identifier for the action'),
  name: z.string().min(1).max(255).describe('The name of the agent'),
  createdAt: z.date().describe('The date and time the agent was created'),
  updatedAt: z.date().describe('The date and time the agent was last updated'),
  createdBy: z.string().describe('The user who created the agent'),
  updatedBy: z.string().describe('The user who last updated the agent'),
});

export type Context = z.infer<typeof ContextSchema>;

@Exclude()
export class ContextEntity extends Entity<string, typeof ContextSchema> {
  @Expose()
  declare public id: string;
  @Expose()
  public name!: string;
  @Expose()
  public createdAt!: Date;
  @Expose()
  public updatedAt!: Date;
}
