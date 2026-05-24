import { z } from 'zod';
import { generateIdentity } from '../utils/identity.generator';

export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
}

// --- Content part schemas (aligned with AI SDK v6 UIPart shapes) ---

const StepStartPartSchema = z.object({ type: z.literal('step-start') }).loose();

const TextPartSchema = z
  .object({
    type: z.literal('text'),
    text: z.string(),
    state: z.enum(['streaming', 'done']).optional(),
    synthetic: z.boolean().optional(),
  })
  .loose();

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
    type: z.string().refine((t) => t.startsWith('tool-') || t === 'dynamic-tool'),
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

const ReasoningPartSchema = z
  .object({
    type: z.literal('reasoning'),
    text: z.string(),
    state: z.enum(['streaming', 'done']).optional(),
  })
  .loose();

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

const RenderedPartSchema = z
  .object({
    type: z.literal('rendered'),
    text: z.string(),
    sentinelMarker: z.string().optional(),
  })
  .loose();

export const MessageContentPartSchema = z.union([
  StepStartPartSchema,
  TextPartSchema,
  ReasoningPartSchema,
  FilePartSchema,
  ToolInvocationPartSchema,
  RenderedPartSchema,
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
    cache: z.object({ read: z.number(), write: z.number() }).optional(),
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
  })
  .loose();

export type MessageMetadata = z.infer<typeof MessageMetadataSchema>;

// --- Message entity ---

export const MessageSchema = z.object({
  id: z.uuid().describe('The unique identifier for the message'),
  sessionId: z.uuid().describe('The session this message belongs to'),
  content: MessageContentSchema.describe('The content of the message (composable parts)'),
  role: z.nativeEnum(MessageRole).describe('The role of the message'),
  metadata: MessageMetadataSchema.default({}).describe('The metadata of the message'),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Message = z.infer<typeof MessageSchema>;

export const CreateMessageInputSchema = z.object({
  sessionId: z.uuid(),
  content: MessageContentSchema,
  role: z.nativeEnum(MessageRole),
  metadata: MessageMetadataSchema.optional(),
});
export type CreateMessageInput = z.infer<typeof CreateMessageInputSchema>;

export const UpdateMessageInputSchema = z.object({
  content: MessageContentSchema.optional(),
  metadata: MessageMetadataSchema.optional(),
});
export type UpdateMessageInput = z.infer<typeof UpdateMessageInputSchema>;

export const MessageOutputSchema = MessageSchema;
export type MessageOutput = z.infer<typeof MessageOutputSchema>;

export function createMessage(input: CreateMessageInput): Message {
  const { id } = generateIdentity();
  const now = new Date();
  return MessageSchema.parse({
    id,
    sessionId: input.sessionId,
    content: input.content,
    role: input.role,
    metadata: input.metadata ?? {},
    createdAt: now,
    updatedAt: now,
  });
}

export function updateMessage(current: Message, input: UpdateMessageInput): Message {
  return MessageSchema.parse({
    ...current,
    ...(input.content !== undefined && { content: input.content }),
    ...(input.metadata !== undefined && { metadata: input.metadata }),
    updatedAt: new Date(),
  });
}
