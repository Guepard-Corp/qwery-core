import { Entity } from '../../common/entity';
import { z } from 'zod';
import { Exclude, Expose } from 'class-transformer';

export const AgentSchema = z.object({
  id: z.string().uuid().describe('The unique identifier for the agent'),
  name: z.string().min(1).max(255).describe('The name of the agent'),
  description: z
    .string()
    .min(1)
    .max(1024)
    .describe('The description of the agent'),
  role: z.string().min(1).max(255).describe('The role of the agent'),
  capabilities: z.array(z.string()).describe('The capabilities of the agent'),
  policies: z.array(z.string()).describe('The policies of the agent'),
  createdAt: z.date().describe('The date and time the agent was created'),
  updatedAt: z.date().describe('The date and time the agent was last updated'),
  createdBy: z.string().describe('The user who created the agent'),
  updatedBy: z.string().describe('The user who last updated the agent'),
});

export type Agent = z.infer<typeof AgentSchema>;

export const AgentStateSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string(),
    }),
  ),
});

@Exclude()
export class AgentEntity extends Entity<string, typeof AgentSchema> {
  @Expose()
  declare public id: string;
  @Expose()
  public name!: string;
  @Expose()
  public createdAt!: Date;
  @Expose()
  public updatedAt!: Date;
  @Expose()
  public createdBy!: string;
  @Expose()
  public updatedBy!: string;
}
