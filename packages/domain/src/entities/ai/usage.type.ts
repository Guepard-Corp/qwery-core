import { v4 as uuidv4 } from 'uuid';
import { Entity } from '../../common/entity';
import { z } from 'zod';
import { Exclude, Expose, plainToClass } from 'class-transformer';
import { CreateUsageInput } from '../../usecases';

export const UsageSchema = z.object({
  id: z.uuid().describe('Usage id'),
  conversationId: z
    .uuid()
    .describe('The unique identifier for the conversation'),
  projectId: z.uuid().describe('The unique identifier for the project'),
  organizationId: z
    .uuid()
    .describe('The unique identifier for the organization'),
  userId: z.uuid().describe('The unique identifier for the user'),
  model: z.string().describe('The name of the model'),
  inputTokens: z
    .number()
    .describe('The total number of input tokens used')
    .default(0),
  outputTokens: z
    .number()
    .describe('The total number of output tokens used')
    .default(0),
  totalTokens: z
    .number()
    .describe('The total number of tokens used')
    .default(0),
  reasoningTokens: z
    .number()
    .describe('The total number of reasoning tokens used')
    .default(0),
  cachedInputTokens: z
    .number()
    .describe('The total number of cached input tokens used')
    .default(0),
  cost: z.number().describe('The cost in USD for this usage').default(0),
  contextSize: z
    .number()
    .describe('The used context size of the model')
    .default(0),
  creditsCap: z
    .number()
    .describe('The maximum number of credits capacity')
    .default(0),
  creditsUsed: z.number().describe('The number of credits used').default(0),
  cpu: z.number().describe('The CPU usage in percentage').default(0),
  memory: z.number().describe('The memory usage in percentage').default(0),
  network: z.number().describe('The network usage in percentage').default(0),
  gpu: z.number().describe('The GPU usage in percentage').default(0),
  storage: z.number().describe('The storage usage in percentage').default(0),
  timestamp: z
    .date()
    .default(new Date())
    .describe('The timestamp of the usage'),
});

const UsageCreateSchema = UsageSchema.extend({
  id: z.uuid().optional(),
});

export type Usage = z.infer<typeof UsageSchema>;

@Exclude()
export class UsageEntity extends Entity<string, typeof UsageSchema> {
  @Expose()
  declare public id: string;
  @Expose()
  public conversationId!: string;
  @Expose()
  public projectId!: string;
  @Expose()
  public organizationId!: string;
  @Expose()
  public userId!: string;
  @Expose()
  public model!: string;
  @Expose()
  public inputTokens!: number;
  @Expose()
  public outputTokens!: number;
  @Expose()
  public totalTokens!: number;
  @Expose()
  public reasoningTokens!: number;
  @Expose()
  public cachedInputTokens!: number;
  @Expose()
  public cost!: number;
  @Expose()
  public creditsCap!: number;
  @Expose()
  public creditsUsed!: number;
  @Expose()
  public cpu!: number;
  @Expose()
  public memory!: number;
  @Expose()
  public network!: number;
  @Expose()
  public gpu!: number;
  @Expose()
  public storage!: number;
  @Expose()
  public contextSize!: number;
  @Expose()
  public timestamp!: Date;

  public static new(usage: CreateUsageInput): UsageEntity {
    const parsed = UsageCreateSchema.parse(usage);
    const withId = { ...parsed, id: parsed.id ?? uuidv4() };
    return plainToClass(UsageEntity, withId, {
      excludeExtraneousValues: true,
    });
  }
}
