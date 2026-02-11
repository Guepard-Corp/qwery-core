import { convertToModelMessages, type ModelMessage, type UIMessage } from 'ai';
import { z } from 'zod';
import type { IMessageRepository } from '@qwery/domain/repositories';
import type { Message, MessageContent } from '@qwery/domain/entities';
import type { Model } from './provider';

export type { Message };
import { fn } from './utils/fn';

/** Part type from domain MessageContent (single element of content.parts array). */
export type MessageContentPart = NonNullable<MessageContent['parts']>[number];

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

function getParts(message: Message): MessageContentPart[] {
  return message.content?.parts ?? [];
}

function getMessageInfo(message: Message) {
  const metadata = message.metadata ?? {};
  return {
    id: message.id,
    conversationId: message.conversationId,
    role: message.role as 'user' | 'assistant',
    ...metadata,
  };
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
  messages: Message[],
  model: Model,
): Promise<ModelMessage[]> {
  const result: UIMessage[] = [];
  const toolNames = new Set<string>();

  for (const message of messages) {
    const parts = getParts(message);
    if (parts.length === 0) continue;

    const info = getMessageInfo(message);

    if (info.role === 'user') {
      const userMessage: UIMessage = {
        id: info.id,
        role: 'user',
        parts: [],
      };
      result.push(userMessage);
      for (const part of parts) {
        const partRecord = part as Record<string, unknown>;
        if (part.type === 'text' && !partRecord.ignored) {
          userMessage.parts.push({
            type: 'text',
            text: typeof partRecord.text === 'string' ? partRecord.text : '',
          });
        }
        if (part.type === 'file') {
          const mime =
            (partRecord.mediaType as string | undefined) ??
            (partRecord.mime as string | undefined);
          if (
            mime &&
            mime !== 'text/plain' &&
            mime !== 'application/x-directory'
          ) {
            userMessage.parts.push({
              type: 'file',
              url: String(partRecord.url ?? ''),
              mediaType: mime,
              filename: partRecord.filename as string | undefined,
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

    if (info.role === 'assistant') {
      const assistantMeta = info as {
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
          parts.some((p) => p.type !== 'step-start' && p.type !== 'reasoning')
        )
      ) {
        continue;
      }

      const assistantMessage: UIMessage = {
        id: info.id,
        role: 'assistant',
        parts: [],
      };
      for (const part of parts) {
        const partRecord = part as Record<string, unknown>;
        if (part.type === 'text') {
          const partMeta = differentModel
            ? undefined
            : (partRecord.metadata as Record<string, unknown> | undefined);
          assistantMessage.parts.push({
            type: 'text',
            text: (partRecord.text as string) ?? '',
            ...(partMeta !== undefined ? { providerMetadata: partMeta } : {}),
          } as UIMessage['parts'][number]);
        }
        if (part.type === 'step-start') {
          assistantMessage.parts.push({ type: 'step-start' });
        }
        if (
          typeof part.type === 'string' &&
          (part.type.startsWith('tool-') || part.type === 'dynamic-tool')
        ) {
          const tp = partRecord;
          const toolName =
            part.type === 'dynamic-tool'
              ? String(tp.toolName ?? '')
              : part.type.replace(/^tool-/, '');
          toolNames.add(toolName);
          const state = tp.state as string | undefined;
          const compactedAt = tp.compactedAt as number | undefined;
          const output =
            compactedAt !== undefined
              ? '[Old tool result content cleared]'
              : tp.output;
          if (state === 'output-error') {
            assistantMessage.parts.push({
              type: part.type as `tool-${string}`,
              state: 'output-error',
              toolCallId: String(tp.toolCallId ?? ''),
              input: tp.input,
              errorText: String(tp.errorText ?? ''),
              ...(tp.title !== undefined && { title: String(tp.title) }),
              ...(tp.isError !== undefined && { isError: Boolean(tp.isError) }),
            } as UIMessage['parts'][number]);
          } else {
            assistantMessage.parts.push({
              type: part.type as `tool-${string}`,
              state: (state as 'output-available') ?? 'output-available',
              toolCallId: String(tp.toolCallId ?? ''),
              input: tp.input,
              output,
              ...(tp.title !== undefined && { title: String(tp.title) }),
              ...(tp.isError !== undefined && { isError: Boolean(tp.isError) }),
            } as UIMessage['parts'][number]);
          }
        }
        if (part.type === 'tool') {
          const tp = partRecord;
          const tool = String(tp.tool ?? '');
          const state = tp.state as {
            status?: string;
            input?: unknown;
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
            : (partRecord.metadata as Record<string, unknown> | undefined);
          assistantMessage.parts.push({
            type: 'reasoning',
            text: (partRecord.text as string) ?? '',
            ...(partMeta !== undefined ? { providerMetadata: partMeta } : {}),
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
  stream: AsyncIterable<Message>,
): Promise<Message[]> {
  const result: Message[] = [];
  const completed = new Set<string>();
  for await (const message of stream) {
    result.push(message);
    const metadata = message.metadata as
      | {
          parentId?: string;
          summary?: boolean;
          finish?: string;
        }
      | undefined;
    const parts = getParts(message);
    if (
      message.role === 'user' &&
      completed.has(message.id) &&
      parts.some((p) => p.type === 'compaction')
    ) {
      break;
    }
    if (
      message.role === 'assistant' &&
      metadata?.summary &&
      metadata?.finish &&
      metadata?.parentId
    ) {
      completed.add(metadata.parentId);
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
      yield messages[i]!;
    }
  });

  const parts = fn(z.string(), async (messageId: string) => {
    const message = await messageRepository.findById(messageId);
    if (!message) return [];
    const contentParts = getParts(message);
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
    async (input): Promise<Message> => {
      const message = await messageRepository.findById(input.messageId);
      if (!message) {
        throw new Error(`Message not found: ${input.messageId}`);
      }
      if (message.conversationId !== input.conversationId) {
        throw new Error(
          `Message ${input.messageId} does not belong to conversation ${input.conversationId}`,
        );
      }
      return message;
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
