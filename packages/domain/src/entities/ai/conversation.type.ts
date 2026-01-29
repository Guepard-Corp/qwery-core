import { Entity } from '../../common/entity';
import { z } from 'zod/v3';
import {
  Exclude,
  Expose,
  plainToClass,
  instanceToPlain,
  Type,
} from 'class-transformer';
import { generateIdentity } from '../../utils/identity.generator';
import {
  CreateConversationInput,
  UpdateConversationInput,
} from '../../usecases';

export const ConversationSchema = z.object({
  id: z.string().uuid().describe('The unique identifier for the action'),
  title: z.string().describe('The title of the conversation'),
  seedMessage: z
    .string()
    .optional()
    .describe('The seed message for the conversation'),
  taskId: z.string().uuid().describe('The unique identifier for the task'),
  projectId: z
    .string()
    .uuid()
    .describe('The unique identifier for the project'),
  slug: z.string().describe('The slug of the conversation'),
  datasources: z
    .array(z.string().min(1))
    .describe('The datasources to use for the conversation'),
  createdAt: z
    .date()
    .describe('The date and time the conversation was created'),
  updatedAt: z
    .date()
    .describe('The date and time the conversation was last updated'),
  createdBy: z.string().describe('The user who created the conversation'),
  updatedBy: z.string().describe('The user who last updated the conversation'),
  isPublic: z
    .boolean()
    .default(false)
    .describe('If true, this conversation is publicly viewable'),
  remixedFrom: z
    .string()
    .uuid()
    .optional()
    .nullable()
    .describe(
      'If set, this conversation was remixed from another conversation',
    ),
});

export type Conversation = z.infer<typeof ConversationSchema>;

@Exclude()
export class ConversationEntity extends Entity<
  string,
  typeof ConversationSchema
> {
  @Expose()
  declare public id: string;
  @Expose()
  public title!: string;
  @Expose()
  public seedMessage!: string;
  @Expose()
  public projectId!: string;
  @Expose()
  public slug!: string;
  @Expose()
  public datasources!: string[];
  @Expose()
  public taskId!: string;
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
  @Expose()
  public isPublic!: boolean;
  @Expose()
  public remixedFrom?: string | null;

  public static create(
    newConversation: CreateConversationInput,
  ): ConversationEntity {
    const { id, slug } = generateIdentity();
    const now = new Date();
    const conversation: Conversation = {
      id,
      projectId: newConversation.projectId,
      taskId: newConversation.taskId,
      title: newConversation.title,
      seedMessage: newConversation.seedMessage,
      slug,
      datasources: newConversation.datasources || [],
      createdAt: now,
      updatedAt: now,
      createdBy: newConversation.createdBy,
      updatedBy: newConversation.createdBy,
      isPublic: false,
    };

    return plainToClass(
      ConversationEntity,
      ConversationSchema.parse(conversation),
    );
  }

  public static update(
    conversation: Conversation,
    conversationDTO: UpdateConversationInput,
  ): ConversationEntity {
    const date = new Date();

    const updatedConversation: Conversation = {
      ...conversation,
      ...(conversationDTO.title && { title: conversationDTO.title }),
      ...(conversationDTO.datasources && {
        datasources: conversationDTO.datasources,
      }),
      updatedAt: date,
      updatedBy: conversationDTO.updatedBy,
    };

    const transformed = plainToClass(ConversationEntity, updatedConversation);

    const plainData = instanceToPlain(transformed) as Conversation;

    return plainToClass(
      ConversationEntity,
      ConversationSchema.parse(plainData),
    );
  }
}
