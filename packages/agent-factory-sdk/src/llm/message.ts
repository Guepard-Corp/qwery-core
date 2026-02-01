import { convertToModelMessages, type ModelMessage, type UIMessage } from 'ai';
import { z } from 'zod';
import type { IMessageRepository } from '@qwery/domain/repositories';
import type { Message } from '@qwery/domain/entities';
import type { Model } from './provider';
import { fn } from './utils/fn';

function createNamedError<T extends z.ZodObject<Record<string, z.ZodTypeAny>>>(
  errorName: string,
  schema: T,
) {
  const ErrorClass = class extends Error {
    readonly payload: z.infer<T>;

    constructor(payload: z.infer<T>, options?: { cause?: unknown }) {
      super(errorName);
      if (options?.cause !== undefined) {
        (this as Error & { cause?: unknown }).cause = options.cause;
      }
      Object.defineProperty(this, 'name', { value: errorName });
      this.payload = schema.parse(payload);
    }

    toObject(): { name: string } & z.infer<T> {
      return { name: errorName, ...this.payload };
    }

    static isInstance(e: unknown): e is InstanceType<typeof ErrorClass> {
      return e instanceof ErrorClass;
    }
  };
  return Object.assign(ErrorClass, { Schema: schema }) as typeof ErrorClass & {
    Schema: T;
  };
}

/****************************************************
 * Error types for messages.
 ****************************************************/
export const OutputLengthError = createNamedError(
  'MessageOutputLengthError',
  z.object({}),
);
export const AbortedError = createNamedError(
  'MessageAbortedError',
  z.object({ message: z.string() }),
);
export const AuthError = createNamedError(
  'ProviderAuthError',
  z.object({
    providerID: z.string(),
    message: z.string(),
  }),
);
export const APIError = createNamedError(
  'APIError',
  z.object({
    message: z.string(),
    statusCode: z.number().optional(),
    isRetryable: z.boolean(),
    responseHeaders: z.record(z.string(), z.string()).optional(),
    responseBody: z.string().optional(),
    metadata: z.record(z.string(), z.string()).optional(),
  }),
);

export type APIErrorType = z.infer<typeof APIError.Schema>;

export type NormalizedError =
  | z.infer<typeof OutputLengthError.Schema>
  | z.infer<typeof AbortedError.Schema>
  | z.infer<typeof AuthError.Schema>
  | z.infer<typeof APIError.Schema>
  | { name: 'Unknown'; message: string };

/****************************************************
 * Part schemas for messages.
 ****************************************************/
const PartBaseSchema = z.object({
  id: z.string().optional(),
  conversationId: z.string().optional(),
  messageId: z.string().optional(),
});

export const SnapshotPartSchema = PartBaseSchema.extend({
  type: z.literal('snapshot'),
  snapshot: z.string(),
});
export type SnapshotPart = z.infer<typeof SnapshotPartSchema>;

export const PatchPartSchema = PartBaseSchema.extend({
  type: z.literal('patch'),
  hash: z.string(),
  files: z.array(z.string()),
});
export type PatchPart = z.infer<typeof PatchPartSchema>;

export const TextPartSchema = PartBaseSchema.extend({
  type: z.literal('text'),
  text: z.string(),
  synthetic: z.boolean().optional(),
  ignored: z.boolean().optional(),
  time: z
    .object({
      start: z.number(),
      end: z.number().optional(),
    })
    .optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});
export type TextPart = z.infer<typeof TextPartSchema>;

export const ReasoningPartSchema = PartBaseSchema.extend({
  type: z.literal('reasoning'),
  text: z.string(),
  metadata: z.record(z.string(), z.any()).optional(),
  time: z
    .object({
      start: z.number(),
      end: z.number().optional(),
    })
    .optional(),
});
export type ReasoningPart = z.infer<typeof ReasoningPartSchema>;

const FilePartSourceTextSchema = z.object({
  value: z.string(),
  start: z.number().int(),
  end: z.number().int(),
});

export const FileSourceSchema = FilePartSourceTextSchema.extend({
  type: z.literal('file'),
  path: z.string(),
});
export type FileSource = z.infer<typeof FileSourceSchema>;

const RangeSchema = z.object({
  start: z.object({ line: z.number(), character: z.number() }),
  end: z.object({ line: z.number(), character: z.number() }),
});

export const SymbolSourceSchema = FilePartSourceTextSchema.extend({
  type: z.literal('symbol'),
  path: z.string(),
  range: RangeSchema,
  name: z.string(),
  kind: z.number().int(),
});
export type SymbolSource = z.infer<typeof SymbolSourceSchema>;

export const ResourceSourceSchema = FilePartSourceTextSchema.extend({
  type: z.literal('resource'),
  clientName: z.string(),
  uri: z.string(),
});
export type ResourceSource = z.infer<typeof ResourceSourceSchema>;

export const FilePartSourceSchema = z.discriminatedUnion('type', [
  FileSourceSchema,
  SymbolSourceSchema,
  ResourceSourceSchema,
]);
export type FilePartSource = z.infer<typeof FilePartSourceSchema>;

export const FilePartSchema = PartBaseSchema.extend({
  type: z.literal('file'),
  mime: z.string(),
  filename: z.string().optional(),
  url: z.string(),
  source: FilePartSourceSchema.optional(),
});
export type FilePart = z.infer<typeof FilePartSchema>;

export const AgentPartSchema = PartBaseSchema.extend({
  type: z.literal('agent'),
  name: z.string(),
  source: z
    .object({
      value: z.string(),
      start: z.number().int(),
      end: z.number().int(),
    })
    .optional(),
});
export type AgentPart = z.infer<typeof AgentPartSchema>;

export const CompactionPartSchema = PartBaseSchema.extend({
  type: z.literal('compaction'),
  auto: z.boolean(),
});
export type CompactionPart = z.infer<typeof CompactionPartSchema>;

export const SubtaskPartSchema = PartBaseSchema.extend({
  type: z.literal('subtask'),
  prompt: z.string(),
  description: z.string(),
  agent: z.string(),
  model: z
    .object({
      providerID: z.string(),
      modelID: z.string(),
    })
    .optional(),
  command: z.string().optional(),
});
export type SubtaskPart = z.infer<typeof SubtaskPartSchema>;

export const RetryPartSchema = PartBaseSchema.extend({
  type: z.literal('retry'),
  attempt: z.number(),
  error: APIError.Schema,
  time: z.object({
    created: z.number(),
  }),
});
export type RetryPart = z.infer<typeof RetryPartSchema>;

export const StepStartPartSchema = PartBaseSchema.extend({
  type: z.literal('step-start'),
  snapshot: z.string().optional(),
});
export type StepStartPart = z.infer<typeof StepStartPartSchema>;

export const StepFinishPartSchema = PartBaseSchema.extend({
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
});
export type StepFinishPart = z.infer<typeof StepFinishPartSchema>;

export const ToolStatePendingSchema = z.object({
  status: z.literal('pending'),
  input: z.record(z.string(), z.any()),
  raw: z.string(),
});
export type ToolStatePending = z.infer<typeof ToolStatePendingSchema>;

export const ToolStateRunningSchema = z.object({
  status: z.literal('running'),
  input: z.record(z.string(), z.any()),
  title: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  time: z.object({
    start: z.number(),
  }),
});
export type ToolStateRunning = z.infer<typeof ToolStateRunningSchema>;

export const ToolStateCompletedSchema = z.object({
  status: z.literal('completed'),
  input: z.record(z.string(), z.any()),
  output: z.string(),
  title: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  time: z.object({
    start: z.number(),
    end: z.number(),
    compacted: z.number().optional(),
  }),
  attachments: z.array(FilePartSchema).optional(),
});
export type ToolStateCompleted = z.infer<typeof ToolStateCompletedSchema>;

export const ToolStateErrorSchema = z.object({
  status: z.literal('error'),
  input: z.record(z.string(), z.any()),
  error: z.string(),
  metadata: z.record(z.string(), z.any()).optional(),
  time: z.object({
    start: z.number(),
    end: z.number(),
  }),
});
export type ToolStateError = z.infer<typeof ToolStateErrorSchema>;

export const ToolStateSchema = z.discriminatedUnion('status', [
  ToolStatePendingSchema,
  ToolStateRunningSchema,
  ToolStateCompletedSchema,
  ToolStateErrorSchema,
]);
export type ToolState = z.infer<typeof ToolStateSchema>;

export const ToolPartSchema = PartBaseSchema.extend({
  type: z.literal('tool'),
  callID: z.string(),
  tool: z.string(),
  state: ToolStateSchema,
  metadata: z.record(z.string(), z.any()).optional(),
});
export type ToolPart = z.infer<typeof ToolPartSchema>;

const StrictPartSchema = z.discriminatedUnion('type', [
  TextPartSchema,
  SubtaskPartSchema,
  ReasoningPartSchema,
  FilePartSchema,
  ToolPartSchema,
  StepStartPartSchema,
  StepFinishPartSchema,
  SnapshotPartSchema,
  PatchPartSchema,
  AgentPartSchema,
  RetryPartSchema,
  CompactionPartSchema,
]);

export const PartSchema = z.union([
  StrictPartSchema,
  z.object({ type: z.string() }).passthrough(),
]);
export type Part = z.infer<typeof PartSchema>;

/****************************************************
 * Message info (user / assistant) with mandatory states.
 ****************************************************/
const InfoBaseSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  role: z.enum(['user', 'assistant']),
});

const UserInfoSchema = InfoBaseSchema.extend({
  role: z.literal('user'),
  time: z
    .object({
      created: z.number(),
    })
    .optional(),
  summary: z
    .object({
      title: z.string().optional(),
      body: z.string().optional(),
      diffs: z.array(z.unknown()).optional(),
    })
    .optional(),
  agent: z.string().optional(),
  model: z
    .object({
      providerID: z.string(),
      modelID: z.string(),
    })
    .optional(),
  system: z.string().optional(),
  tools: z.record(z.string(), z.boolean()).optional(),
  variant: z.string().optional(),
});

const AssistantInfoSchema = InfoBaseSchema.extend({
  role: z.literal('assistant'),
  time: z
    .object({
      created: z.number(),
      completed: z.number().optional(),
    })
    .optional(),
  error: z.unknown().optional(),
  parentId: z.string().optional(),
  modelId: z.string().optional(),
  providerId: z.string().optional(),
  mode: z.string().optional(),
  agent: z.string().optional(),
  path: z
    .object({
      cwd: z.string(),
      root: z.string(),
    })
    .optional(),
  summary: z.boolean().optional(),
  cost: z.number().optional(),
  tokens: z
    .object({
      input: z.number(),
      output: z.number(),
      reasoning: z.number(),
      cache: z.object({
        read: z.number(),
        write: z.number(),
      }),
    })
    .optional(),
  finish: z.string().optional(),
});

export const MessageInfoSchema = z.discriminatedUnion('role', [
  UserInfoSchema,
  AssistantInfoSchema,
]);

export type MessageInfo = z.infer<typeof MessageInfoSchema>;

export const WithPartsSchema = z.object({
  info: MessageInfoSchema,
  parts: z.array(PartSchema),
});

export type WithParts = z.infer<typeof WithPartsSchema>;

function messageToWithParts(message: Message): WithParts {
  const content = message.content;
  const parts = (content?.parts ?? []) as Part[];
  const metadata = message.metadata ?? {};

  const info: MessageInfo = {
    id: message.id,
    conversationId: message.conversationId,
    role: message.role as 'user' | 'assistant',
    ...(metadata as Record<string, unknown>),
  };

  return { info, parts };
}

function toModelOutput(
  output: unknown,
):
  | { type: 'text'; value: string }
  | { type: 'content'; value: unknown[] }
  | { type: 'json'; value: unknown } {
  if (typeof output === 'string') {
    return { type: 'text', value: output };
  }
  if (typeof output === 'object' && output !== null) {
    const obj = output as {
      text?: string;
      attachments?: Array<{ mime: string; url: string }>;
    };
    const attachments = (obj.attachments ?? []).filter(
      (a) => a.url.startsWith('data:') && a.url.includes(','),
    );
    const commaIndex = (url: string) => url.indexOf(',');
    return {
      type: 'content',
      value: [
        { type: 'text', text: obj.text ?? '' },
        ...attachments.map((a) => ({
          type: 'media' as const,
          mediaType: a.mime,
          data:
            commaIndex(a.url) === -1
              ? a.url
              : a.url.slice(commaIndex(a.url) + 1),
        })),
      ],
    };
  }
  return { type: 'json', value: output };
}

export async function toModelMessages(
  input: WithParts[],
  model: Model,
): Promise<ModelMessage[]> {
  const result: UIMessage[] = [];
  const toolNames = new Set<string>();

  for (const msg of input) {
    if (msg.parts.length === 0) continue;

    if (msg.info.role === 'user') {
      const userMessage: UIMessage = {
        id: msg.info.id,
        role: 'user',
        parts: [],
      };
      result.push(userMessage);
      for (const part of msg.parts) {
        if (part.type === 'text' && !(part as { ignored?: boolean }).ignored) {
          userMessage.parts.push({
            type: 'text',
            text:
              typeof (part as { text?: unknown }).text === 'string'
                ? (part as { text: string }).text
                : '',
          });
        }
        if (part.type === 'file') {
          const fp = part as Record<string, unknown>;
          const mime = fp.mime as string | undefined;
          if (mime !== 'text/plain' && mime !== 'application/x-directory') {
            userMessage.parts.push({
              type: 'file',
              url: String(fp.url ?? ''),
              mediaType: mime ?? 'application/octet-stream',
              filename: fp.filename as string | undefined,
            });
          }
        }
        if (part.type === 'compaction') {
          userMessage.parts.push({
            type: 'text',
            text: 'What did we do so far?',
          });
        }
        if (part.type === 'subtask') {
          userMessage.parts.push({
            type: 'text',
            text: 'The following tool was executed by the user',
          });
        }
      }
    }

    if (msg.info.role === 'assistant') {
      const assistantMeta = msg.info as {
        providerId?: string;
        modelId?: string;
        error?: unknown;
      };
      const differentModel =
        `${model.providerID}/${model.id}` !==
        `${assistantMeta.providerId ?? ''}/${assistantMeta.modelId ?? ''}`;

      if (
        assistantMeta.error &&
        !(
          AbortedError.isInstance(assistantMeta.error) &&
          msg.parts.some(
            (p) => p.type !== 'step-start' && p.type !== 'reasoning',
          )
        )
      ) {
        continue;
      }

      const assistantMessage: UIMessage = {
        id: msg.info.id,
        role: 'assistant',
        parts: [],
      };
      for (const part of msg.parts) {
        if (part.type === 'text') {
          const partMeta = differentModel
            ? undefined
            : (part as Record<string, unknown>).metadata;
          assistantMessage.parts.push({
            type: 'text',
            text: part.text ?? '',
            ...(partMeta !== undefined
              ? { providerMetadata: partMeta as Record<string, unknown> }
              : {}),
          } as UIMessage['parts'][number]);
        }
        if (part.type === 'step-start') {
          assistantMessage.parts.push({ type: 'step-start' });
        }
        if (part.type === 'tool') {
          const tp = part as Record<string, unknown>;
          const tool = String(tp.tool ?? '');
          const state = tp.state as {
            status: string;
            input: unknown;
            output?: string;
            error?: string;
            time?: { compacted?: number };
            attachments?: unknown[];
          };
          const partMeta = differentModel ? undefined : tp.metadata;
          const metaSpread =
            partMeta !== undefined
              ? { callProviderMetadata: partMeta as Record<string, unknown> }
              : {};
          toolNames.add(tool);
          if (state?.status === 'completed') {
            const outputText = state.time?.compacted
              ? '[Old tool result content cleared]'
              : (state.output ?? '');
            const attachments = state.time?.compacted
              ? []
              : (state.attachments ?? []);
            const output =
              attachments.length > 0
                ? { text: outputText, attachments }
                : outputText;
            assistantMessage.parts.push({
              type: `tool-${tool}` as `tool-${string}`,
              state: 'output-available',
              toolCallId: String(tp.callID ?? ''),
              input: state.input,
              output,
              ...metaSpread,
            } as UIMessage['parts'][number]);
          }
          if (state?.status === 'error') {
            assistantMessage.parts.push({
              type: `tool-${tool}` as `tool-${string}`,
              state: 'output-error',
              toolCallId: String(tp.callID ?? ''),
              input: state.input,
              errorText: state.error ?? '',
              ...metaSpread,
            } as UIMessage['parts'][number]);
          }
          if (state?.status === 'pending' || state?.status === 'running') {
            assistantMessage.parts.push({
              type: `tool-${tool}` as `tool-${string}`,
              state: 'output-error',
              toolCallId: String(tp.callID ?? ''),
              input: state.input,
              errorText: '[Tool execution was interrupted]',
              ...metaSpread,
            } as UIMessage['parts'][number]);
          }
        }
        if (part.type === 'reasoning') {
          const partMeta = differentModel
            ? undefined
            : (part as Record<string, unknown>).metadata;
          assistantMessage.parts.push({
            type: 'reasoning',
            text: part.text ?? '',
            ...(partMeta !== undefined
              ? { providerMetadata: partMeta as Record<string, unknown> }
              : {}),
          } as UIMessage['parts'][number]);
        }
      }
      if (assistantMessage.parts.length > 0) {
        result.push(assistantMessage);
      }
    }
  }

  const tools = Object.fromEntries(
    Array.from(toolNames).map((toolName) => [toolName, { toModelOutput }]),
  );

  return await convertToModelMessages(
    result.filter((msg) => msg.parts.some((p) => p.type !== 'step-start')),
    { tools } as Parameters<typeof convertToModelMessages>[1],
  );
}

export async function filterCompacted(
  stream: AsyncIterable<WithParts>,
): Promise<WithParts[]> {
  const result: WithParts[] = [];
  const completed = new Set<string>();
  for await (const msg of stream) {
    result.push(msg);
    const assistantMeta = msg.info as {
      role: string;
      id: string;
      parentId?: string;
      summary?: boolean;
      finish?: string;
    };
    if (
      msg.info.role === 'user' &&
      completed.has(msg.info.id) &&
      msg.parts.some((p) => p.type === 'compaction')
    ) {
      break;
    }
    if (
      msg.info.role === 'assistant' &&
      assistantMeta.summary &&
      assistantMeta.finish &&
      assistantMeta.parentId
    ) {
      completed.add(assistantMeta.parentId);
    }
  }
  result.reverse();
  return result;
}

export function fromError(
  e: unknown,
  ctx: { providerID: string },
): NormalizedError {
  if (e instanceof DOMException && e.name === 'AbortError') {
    return new AbortedError(
      { message: e.message },
      { cause: e },
    ).toObject() as NormalizedError;
  }
  if (OutputLengthError.isInstance(e)) {
    return e.toObject() as NormalizedError;
  }
  const err = e as NodeJS.ErrnoException & {
    isRetryable?: boolean;
    statusCode?: number;
    message?: string;
    responseBody?: string;
    responseHeaders?: Record<string, string>;
  };
  if (err?.code === 'ECONNRESET') {
    return new APIError(
      {
        message: 'Connection reset by server',
        isRetryable: true,
        metadata: {
          code: err.code ?? '',
          syscall: err.syscall ?? '',
          message: err.message ?? '',
        },
      },
      { cause: e },
    ).toObject() as NormalizedError;
  }
  if (
    err?.name === 'LoadAPIKeyError' ||
    (err?.message && String(err.message).includes('API key'))
  ) {
    return new AuthError(
      {
        providerID: ctx.providerID,
        message: err.message ?? 'API key not found',
      },
      { cause: e },
    ).toObject() as NormalizedError;
  }
  if (
    err?.name === 'APICallError' ||
    (err?.isRetryable !== undefined && typeof err?.statusCode === 'number')
  ) {
    return new APIError(
      {
        message: err.message ?? 'API error',
        statusCode: err.statusCode,
        isRetryable: Boolean(
          ctx.providerID.startsWith('openai')
            ? err.statusCode === 404 || err.isRetryable
            : (err.isRetryable ?? false),
        ),
        responseHeaders: err.responseHeaders,
        responseBody: err.responseBody,
      },
      { cause: e },
    ).toObject() as NormalizedError;
  }
  if (e instanceof Error) {
    return { name: 'Unknown', message: e.toString() };
  }
  return { name: 'Unknown', message: JSON.stringify(e) };
}

export function createMessages(deps: {
  messageRepository: IMessageRepository;
}) {
  const { messageRepository } = deps;

  const stream = fn(z.string(), async function* (conversationId: string) {
    const messages =
      await messageRepository.findByConversationId(conversationId);
    for (let i = messages.length - 1; i >= 0; i--) {
      yield messageToWithParts(messages[i]!);
    }
  });

  const parts = fn(z.string(), async (messageId: string) => {
    const message = await messageRepository.findById(messageId);
    if (!message) return [];
    const contentParts = (message.content as { parts?: Part[] })?.parts ?? [];
    return [...contentParts].sort((a, b) =>
      ((a as { id?: string }).id ?? '').localeCompare(
        (b as { id?: string }).id ?? '',
      ),
    );
  });

  const get = fn(
    z.object({
      conversationId: z.string(),
      messageId: z.string(),
    }),
    async (input): Promise<WithParts> => {
      const message = await messageRepository.findById(input.messageId);
      if (!message) {
        throw new Error(`Message not found: ${input.messageId}`);
      }
      if (message.conversationId !== input.conversationId) {
        throw new Error(
          `Message ${input.messageId} does not belong to conversation ${input.conversationId}`,
        );
      }
      return messageToWithParts(message);
    },
  );

  return { stream, parts, get };
}

export const Messages = {
  toModelMessages,
  fromError,
  filterCompacted,
  createMessages,
};
