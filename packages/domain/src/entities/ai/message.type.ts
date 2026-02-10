import { Entity } from '../../common/entity';
import { z } from 'zod';
import { Exclude, Expose, plainToClass } from 'class-transformer';
import { generateIdentity } from '../../utils/identity.generator';
import { CreateMessageInput, UpdateMessageInput } from '../../usecases';

export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
}

const MessageContentPartSchema = z
  .object({
    type: z.string(),
    text: z.string().optional(),
    state: z.string().optional(),
  })
  .passthrough();

export const MessageContentSchema = z
  .object({
    id: z.string().optional(),
    role: z.string().optional(),
    parts: z.array(MessageContentPartSchema).optional(),
  })
  .passthrough();

export type MessageContent = z.infer<typeof MessageContentSchema>;

const TokensSchema = z
  .object({
    input: z.number(),
    output: z.number(),
    reasoning: z.number().optional(),
    cache: z
      .object({
        read: z.number(),
        write: z.number(),
      })
      .optional(),
  })
  .passthrough();

export const MessageMetadataSchema = z
  .object({
    error: z.unknown().optional(),
    modelId: z.string().optional(),
    providerId: z.string().optional(),
    cost: z.number().optional(),
    tokens: TokensSchema.optional(),
    parentId: z.string().optional(),
    finish: z.string().optional(),
    summary: z.boolean().optional(),
    path: z
      .object({
        cwd: z.string(),
        root: z.string(),
      })
      .optional(),
    agent: z.string().optional(),
    model: z
      .object({
        providerID: z.string(),
        modelID: z.string(),
      })
      .optional(),
  })
  .passthrough();

export type MessageMetadata = z.infer<typeof MessageMetadataSchema>;

export const MessageSchema = z.object({
  id: z.string().uuid().describe('The unique identifier for the action'),
  conversationId: z
    .string()
    .uuid()
    .describe('The unique identifier for the conversation'),
  content: MessageContentSchema.describe('The content of the message'),
  role: z.nativeEnum(MessageRole).describe('The role of the message'),
  metadata: MessageMetadataSchema.describe('The metadata of the message'),
  createdAt: z.date().describe('The date and time the message was created'),
  updatedAt: z
    .date()
    .describe('The date and time the message was last updated'),
  createdBy: z.string().describe('The user who created the message'),
  updatedBy: z.string().describe('The user who last updated the message'),
});

export type Message = z.infer<typeof MessageSchema>;

@Exclude()
export class MessageEntity extends Entity<string, typeof MessageSchema> {
  @Expose()
  declare public id: string;
  @Expose()
  public conversationId!: string;
  @Expose()
  public content!: MessageContent;
  @Expose()
  public role!: MessageRole;
  @Expose()
  public metadata!: MessageMetadata;
  @Expose()
  public createdAt!: Date;
  @Expose()
  public updatedAt!: Date;
  @Expose()
  public createdBy!: string;
  @Expose()
  public updatedBy!: string;

  public static create(
    newMessage: CreateMessageInput & { conversationId: string },
  ): MessageEntity {
    const { id } = generateIdentity();
    const now = new Date();
    const message: Message = {
      id,
      conversationId: newMessage.conversationId,
      content: newMessage.content,
      role: newMessage.role,
      metadata: newMessage.metadata || {},
      createdAt: now,
      updatedAt: now,
      createdBy: newMessage.createdBy,
      updatedBy: newMessage.createdBy,
    };

    return plainToClass(MessageEntity, MessageSchema.parse(message));
  }

  public static update(
    message: Message,
    messageDTO: UpdateMessageInput,
  ): MessageEntity {
    const date = new Date();

    const updatedMessage: Message = {
      ...message,
      ...(messageDTO.content && { content: messageDTO.content }),
      ...(messageDTO.metadata && { metadata: messageDTO.metadata }),
      updatedAt: date,
      updatedBy: messageDTO.updatedBy,
    };

    return plainToClass(MessageEntity, MessageSchema.parse(updatedMessage));
  }
}
