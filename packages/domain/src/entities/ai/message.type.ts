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

/** Aligned with AI SDK StepStartUIPart */
const StepStartPartSchema = z
  .object({
    type: z.literal('step-start'),
  })
  .loose();

/** Aligned with AI SDK TextUIPart - state: 'streaming' | 'done' */
const TextPartSchema = z
  .object({
    type: z.literal('text'),
    text: z.string(),
    state: z.enum(['streaming', 'done']).optional(),
    synthetic: z.boolean().optional(),
  })
  .loose();

/**
 * AI SDK tool invocation states (ToolUIPart / DynamicToolUIPart):
 * - input-streaming | input-available | approval-requested | approval-responded
 * - output-available | output-error | output-denied
 * Custom extensions: output-streaming, partial-call, call (for streaming/intermediate states)
 */
const TOOL_INVOCATION_STATES = [
  'input-streaming',
  'input-available',
  'approval-requested',
  'approval-responded',
  'output-available',
  'output-error',
  'output-denied',
  'output-streaming',
  'partial-call',
  'call',
] as const;

const ToolInvocationPartSchema = z
  .object({
    type: z
      .string()
      .refine((t) => t.startsWith('tool-') || t === 'dynamic-tool'),
    state: z.enum(TOOL_INVOCATION_STATES).optional(),
    toolCallId: z.string().optional(),
    toolName: z.string().optional(),
    input: z.record(z.string(), z.any()).optional(),
    output: z.unknown().optional(),
    errorText: z.string().optional(),
    title: z.string().optional(),
    isError: z.boolean().optional(),
    compactedAt: z.number().optional(),
  })
  .loose();

/** Aligned with AI SDK ReasoningUIPart */
const ReasoningPartSchema = z
  .object({
    type: z.literal('reasoning'),
    text: z.string(),
    state: z.enum(['streaming', 'done']).optional(),
  })
  .loose();

/** Aligned with AI SDK FileUIPart - mediaType or mime (for compatibility) */
export const FilePartSchema = z
  .object({
    type: z.literal('file'),
    mediaType: z.string().optional(),
    mime: z.string().optional(),
    filename: z.string().optional(),
    url: z.string(),
  })
  .refine((d) => !!(d.mediaType ?? d.mime), {
    message: 'File part must have mediaType or mime',
  })
  .loose();

/** Custom: compaction trigger part (not in AI SDK) */
const CompactionPartSchema = z
  .object({
    type: z.literal('compaction'),
    auto: z.boolean(),
  })
  .loose();

/** Snapshot reference part */
const SnapshotPartSchema = z
  .object({
    type: z.literal('snapshot'),
    snapshot: z.string(),
  })
  .loose();

/** Patch/diff part */
const PatchPartSchema = z
  .object({
    type: z.literal('patch'),
    hash: z.string(),
    files: z.array(z.string()),
  })
  .loose();

/** Agent delegation part */
const AgentPartSchema = z
  .object({
    type: z.literal('agent'),
    name: z.string(),
    source: z
      .object({
        value: z.string(),
        start: z.number().int(),
        end: z.number().int(),
      })
      .optional(),
  })
  .loose();

/** Subtask invocation part */
const SubtaskPartSchema = z
  .object({
    type: z.literal('subtask'),
    prompt: z.string(),
    description: z.string(),
    agent: z.string(),
    modelId: z.string().optional(),
    providerId: z.string().optional(),
    command: z.string().optional(),
  })
  .loose();

/** Retry attempt part */
const RetryPartSchema = z
  .object({
    type: z.literal('retry'),
    attempt: z.number(),
    error: z.record(z.string(), z.any()),
    time: z.object({
      created: z.number(),
    }),
  })
  .loose();

/** Step finish / cost summary part */
const StepFinishPartSchema = z
  .object({
    type: z.literal('step-finish'),
    reason: z.string(),
    snapshot: z.string().optional(),
    cost: z.number(),
    tokens: z.object({
      input: z.number(),
      output: z.number(),
      reasoning: z.number(),
      cache: z.object({
        read: z.number(),
        write: z.number(),
      }),
    }),
  })
  .loose();

/** Internal tool part (type: 'tool' with callID, state object) */
const ToolPartSchema = z
  .object({
    type: z.literal('tool'),
    callID: z.string(),
    tool: z.string(),
    state: z.record(z.string(), z.any()),
  })
  .loose();

export const MessageContentPartSchema = z.union([
  StepStartPartSchema,
  TextPartSchema,
  ReasoningPartSchema,
  FilePartSchema,
  ToolInvocationPartSchema,
  ToolPartSchema,
  CompactionPartSchema,
  SnapshotPartSchema,
  PatchPartSchema,
  AgentPartSchema,
  SubtaskPartSchema,
  RetryPartSchema,
  StepFinishPartSchema,
  z.object({ type: z.string() }).loose(),
]);

export const MessageContentSchema = z
  .object({
    id: z.string().optional(),
    role: z.string().optional(),
    parts: z.array(MessageContentPartSchema).optional(),
  })
  .loose();

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
  .loose();

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
  })
  .loose();

export type MessageMetadata = z.infer<typeof MessageMetadataSchema>;

export const MessageSchema = z.object({
  id: z.uuid().describe('The unique identifier for the action'),
  conversationId: z
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
