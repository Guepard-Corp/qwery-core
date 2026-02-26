import { type UIMessage, convertToModelMessages, validateUIMessages } from 'ai';
import { getDefaultModel } from '../services/model-resolver';
import { generateConversationTitle } from '../services/generate-conversation-title.service';
import { MessagePersistenceService } from '../services/message-persistence.service';
import { UsagePersistenceService } from '../services/usage-persistence.service';
import type { Repositories } from '@qwery/domain/repositories';
import type { TelemetryManager } from '@qwery/telemetry/otel';
import { MessageRole } from '@qwery/domain/entities';
import { createMessages, filterCompacted } from '../llm/message';
import type { Message, MessageContentPart } from '../llm/message';
import { SessionCompaction } from './session-compaction';
import { getLogger } from '@qwery/shared/logger';
import { Registry } from '../tools/registry';
import type { AskRequest, ToolContext, ToolMetadataInput } from '../tools/tool';
import { insertReminders } from './insert-reminders';
import { LLM } from '../llm/llm';
import { Provider } from '../llm/provider';
import { SystemPrompt } from '../llm/system';
import { v4 as uuidv4 } from 'uuid';
import { loadDatasources } from '../tools/datasource-loader';
import type { Datasource } from '@qwery/domain/entities';

export type AgentSessionPromptInput = {
  conversationSlug: string;
  messages: UIMessage[];
  model?: string;
  datasources?: string[];
  repositories: Repositories;
  telemetry: TelemetryManager;
  generateTitle?: boolean;
  /** Agent to run (e.g. 'ask' or 'query'). Defaults to 'query'. */
  agentId?: string;
  /** Optional: called when a tool requests permission (e.g. webfetch). If not provided, ask is a no-op. */
  onAsk?: (req: AskRequest) => Promise<void>;
  /** Optional: called when a tool reports progress (title, metadata). If not provided, metadata is a no-op. */
  onToolMetadata?: (input: {
    callId?: string;
    messageId?: string;
    title?: string;
    metadata?: Record<string, unknown>;
  }) => void | Promise<void>;
  /** Optional: max steps for multi-step tool execution. Overrides agent steps. Default: 5. */
  maxSteps?: number;
  /** Optional: MCP server URL (e.g. qwery server base + /mcp). When set, MCP tools are merged with agent tools. */
  mcpServerUrl?: string;
};

const DEFAULT_AGENT_ID = 'query';

const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  Connection: 'keep-alive',
  'x-vercel-ai-ui-message-stream': 'v1',
} as const;

function ensureTitle(_opts: {
  conversationSlug: string;
  conversationId: string;
  model: string;
  msgs: Message[];
  repositories: Repositories;
}): void {
  // Placeholder: actual title logic runs on stream close.
}

function deriveState(msgs: Message[]) {
  const lastUser = msgs.findLast((m) => m.role === MessageRole.USER);
  const compactionUser = msgs.findLast(
    (m) =>
      m.role === MessageRole.USER &&
      (m.content?.parts ?? []).some((p) => p.type === 'compaction'),
  );
  const lastAssistant = msgs.findLast((m) => m.role === MessageRole.ASSISTANT);
  const lastFinished = msgs.findLast(
    (m) =>
      m.role === MessageRole.ASSISTANT &&
      !!(m.metadata as { finish?: string })?.finish,
  );
  const tasks = msgs
    .flatMap((m) => m.content?.parts ?? [])
    .filter(
      (p): p is MessageContentPart =>
        p.type === 'compaction' || p.type === 'subtask',
    );
  return { lastUser, compactionUser, lastAssistant, lastFinished, tasks };
}

type ToolExecutionStat = {
  toolName: string;
  executionTimeMs: number;
  isError: boolean;
};

function withToolExecutionStats(
  messages: UIMessage[],
  toolExecutionByCallId: ReadonlyMap<string, ToolExecutionStat>,
): UIMessage[] {
  return messages.map((message) => {
    if (!Array.isArray(message.parts) || message.parts.length === 0) {
      return message;
    }

    let hasUpdatedPart = false;
    const updatedParts = message.parts.map((part) => {
      if (
        typeof part !== 'object' ||
        part === null ||
        !('type' in part) ||
        typeof part.type !== 'string'
      ) {
        return part;
      }

      const isToolPart =
        part.type.startsWith('tool-') || part.type === 'dynamic-tool';
      if (!isToolPart) {
        return part;
      }

      const toolCallId =
        'toolCallId' in part && typeof part.toolCallId === 'string'
          ? part.toolCallId
          : '';

      if (!toolCallId) {
        return part;
      }

      const stat = toolExecutionByCallId.get(toolCallId);
      if (!stat) {
        return part;
      }

      hasUpdatedPart = true;
      return {
        ...part,
        executionTimeMs: stat.executionTimeMs,
      };
    });

    if (!hasUpdatedPart) {
      return message;
    }

    return {
      ...message,
      parts: updatedParts,
    };
  });
}

/** One turn: loop with Messages.stream, steps, then return SSE Response. */
export async function loop(input: AgentSessionPromptInput): Promise<Response> {
  const logger = await getLogger();
  const {
    conversationSlug,
    messages,
    model = getDefaultModel(),
    repositories,
    telemetry: _telemetry,
    generateTitle = false,
    agentId: inputAgentId,
    onAsk,
    onToolMetadata,
    maxSteps: inputMaxSteps,
    mcpServerUrl,
  } = input;
  const agentId = inputAgentId ?? DEFAULT_AGENT_ID;

  logger.info(
    `[AgentSession] Starting agent session for conversation: ${conversationSlug}, agent: ${agentId}, datasources: ${input.datasources?.join(', ')}`,
  );

  const conversation =
    await repositories.conversation.findBySlug(conversationSlug);
  if (!conversation) {
    throw new Error(`Conversation with slug '${conversationSlug}' not found`);
  }

  const conversationId = conversation.id;
  const messagesApi = createMessages({
    messageRepository: repositories.message,
  });

  let step = 0;
  let responseToReturn: Response | null = null;
  const abortController = new AbortController();

  while (true) {
    const msgs = await filterCompacted(messagesApi.stream(conversationId));
    const { lastUser, compactionUser, lastFinished, tasks } = deriveState(msgs);

    const hasPendingCompactionTask = tasks.some((t) => t.type === 'compaction');

    step += 1;
    if (step === 1) {
      ensureTitle({
        conversationSlug,
        conversationId,
        model,
        msgs,
        repositories,
      });
    }

    const task = tasks.pop();

    if (task?.type === 'subtask') {
      continue;
    }

    if (task?.type === 'compaction') {
      const result = await SessionCompaction.process({
        parentID: compactionUser?.id ?? lastUser?.id ?? '',
        messages: msgs,
        conversationSlug,
        abort: abortController.signal,
        auto: (task as { auto: boolean }).auto,
        repositories,
      });
      if (result === 'stop') break;
      continue;
    }

    const lastFinishedMeta = lastFinished?.metadata as
      | {
          summary?: boolean;
          tokens?: {
            input: number;
            output: number;
            reasoning: number;
            cache: { read: number; write: number };
          };
        }
      | undefined;
    const lastFinishedSummary = lastFinishedMeta?.summary;
    const lastFinishedTokens = lastFinishedMeta?.tokens;

    if (
      lastFinished &&
      !lastFinishedSummary &&
      lastFinishedTokens &&
      (await SessionCompaction.isOverflow({
        tokens: lastFinishedTokens,
        model,
      }))
    ) {
      logger.info('[AgentSession] Last finished message is overflow', {
        lastFinished,
        userMeta: lastUser?.metadata,
      });

      if (hasPendingCompactionTask) {
        continue;
      }

      const userMeta = lastUser?.metadata as
        | {
            agent?: string;
            model?: { providerID: string; modelID: string };
          }
        | undefined;
      await SessionCompaction.create({
        conversationSlug,
        agent: userMeta?.agent ?? agentId,
        model: userMeta?.model ?? model,
        auto: true,
        repositories,
      });
      continue;
    }

    const shouldGenerateTitle =
      conversation.title === 'New Conversation' && generateTitle;

    const agentInfo = Registry.agents.get(agentId);
    if (!agentInfo) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    const datasources = await loadDatasources(
      conversation.datasources ?? [],
      repositories.datasource,
    );

    const providerModel =
      typeof model === 'string'
        ? Provider.getModelFromString(model)
        : Provider.getDefaultModel();
    const modelForRegistry = {
      providerId: providerModel.providerID,
      modelId: providerModel.id,
    };

    const assistantMessageId = uuidv4();
    const pendingToolStartChunks: Uint8Array[] = [];
    const toolExecutionByCallId = new Map<string, ToolExecutionStat>();
    const encoder = new TextEncoder();
    const enqueueToolStartChunk = (
      toolName: string,
      args: unknown,
      toolCallId: string,
    ) => {
      const line = `data: ${JSON.stringify({ type: 'tool-input-available', toolCallId, toolName, input: args })}\n\n`;
      pendingToolStartChunks.push(encoder.encode(line));
    };
    const captureToolExecution = (
      toolName: string,
      toolCallId: string,
      stats: {
        executionTimeMs: number;
        isError: boolean;
      },
    ) => {
      if (!toolCallId) {
        return;
      }

      toolExecutionByCallId.set(toolCallId, {
        toolName,
        executionTimeMs: stats.executionTimeMs,
        isError: stats.isError,
      });
    };
    const getContext = (options: {
      toolCallId?: string;
      abortSignal?: AbortSignal;
    }): ToolContext => ({
      conversationId,
      agentId,
      messageId: assistantMessageId,
      callId: options.toolCallId,
      abort: options.abortSignal ?? abortController.signal,
      extra: {
        repositories,
        conversationId,
        attachedDatasources: input.datasources,
      },
      messages: msgs,
      ask: async (req: AskRequest) => {
        await onAsk?.(req);
      },
      metadata: async (input: ToolMetadataInput) => {
        await onToolMetadata?.({
          callId: options.toolCallId,
          messageId: assistantMessageId,
          ...input,
        });
      },
      onToolStart: enqueueToolStartChunk,
      onToolComplete: captureToolExecution,
    });

    const { tools, close: closeMcp } = await Registry.tools.forAgent(
      agentId,
      modelForRegistry,
      getContext,
      { mcpServerUrl },
    );

    const reminderContext = {
      attachedDatasourceNames: datasources.map((d: Datasource) => d.name),
    };
    insertReminders({
      messages: msgs,
      agent: agentInfo,
      context: reminderContext,
    });

    const validated = await validateUIMessages({ messages });

    const messagesForLlm =
      msgs.length > 0
        ? msgs
        : await convertToModelMessages(validated, { tools });

    const systemPromptForLlm =
      agentInfo.systemPrompt !== undefined && agentInfo.systemPrompt !== ''
        ? [
            SystemPrompt.provider(providerModel),
            ...(await SystemPrompt.environment(providerModel)),
            agentInfo.systemPrompt,
          ]
            .filter(Boolean)
            .join('\n\n')
        : agentInfo.systemPrompt;

    const metaToolIds = new Set([
      'todowrite',
      'todoread',
      'task',
      'webfetch',
      'get_skill',
    ]);
    const capabilityIds = Object.keys(tools).filter(
      (id) => !metaToolIds.has(id),
    );
    const systemPromptWithSuggestions =
      capabilityIds.length > 0
        ? `${systemPromptForLlm}\n\nSUGGESTIONS - Capabilities: When using {{suggestion: ...}}, only suggest actions you can perform with your tools: ${capabilityIds.join(', ')}. Do not suggest CSV/PDF export, file download, or other actions you cannot perform.`
        : systemPromptForLlm;

    const result = await LLM.stream({
      model,
      messages: messagesForLlm,
      tools,
      maxSteps: inputMaxSteps ?? agentInfo.steps ?? 5,
      abortSignal: abortController.signal,
      systemPrompt: systemPromptWithSuggestions,
      onFinish: closeMcp
        ? async () => {
            await closeMcp();
          }
        : undefined,
    });

    const streamResponse = result.toUIMessageStreamResponse({
      generateMessageId: () => uuidv4(),
      messageMetadata: ({
        part,
      }: {
        part: {
          type: string;
          totalUsage?: {
            inputTokens?: number;
            outputTokens?: number;
            reasoningTokens?: number;
            cachedInputTokens?: number;
          };
        };
      }) => {
        if (part.type === 'finish' && part.totalUsage) {
          const raw = part.totalUsage;
          return {
            tokens: {
              input: raw.inputTokens ?? 0,
              output: raw.outputTokens ?? 0,
              reasoning: raw.reasoningTokens ?? 0,
              cache: {
                read: raw.cachedInputTokens ?? 0,
                write: 0,
              },
            },
            finish: 'stop',
          };
        }
      },
      onFinish: async ({ messages: finishedMessages }) => {
        const messagesWithToolExecution = withToolExecutionStats(
          finishedMessages,
          toolExecutionByCallId,
        );
        const totalUsage = await result.totalUsage;
        const usagePersistenceService = new UsagePersistenceService(
          repositories.usage,
          repositories.conversation,
          repositories.project,
          conversationSlug,
        );
        try {
          await usagePersistenceService.persistUsage(
            totalUsage,
            model,
            conversation.createdBy,
          );
        } catch (error) {
          const log = await getLogger();
          log.error('[AgentSession] Failed to persist usage:', error);
        }

        const lastAssistant = [...messagesWithToolExecution]
          .reverse()
          .find((m) => m.role === 'assistant');
        if (lastAssistant && totalUsage) {
          const raw = totalUsage as {
            inputTokens?: number;
            outputTokens?: number;
            reasoningTokens?: number;
            cachedInputTokens?: number;
          };
          const meta =
            lastAssistant.metadata && typeof lastAssistant.metadata === 'object'
              ? (lastAssistant.metadata as Record<string, unknown>)
              : {};
          lastAssistant.metadata = {
            ...meta,
            tokens: {
              input: raw.inputTokens ?? 0,
              output: raw.outputTokens ?? 0,
              reasoning: raw.reasoningTokens ?? 0,
              cache: {
                read: raw.cachedInputTokens ?? 0,
                write: 0,
              },
            },
            finish: 'stop',
          };
        }

        const persistence = new MessagePersistenceService(
          repositories.message,
          repositories.conversation,
          conversationSlug,
        );
        try {
          const persistResult = await persistence.persistMessages(
            messagesWithToolExecution,
            undefined,
            {
              defaultMetadata: {
                agent: agentId,
                model: {
                  modelID: providerModel.id,
                  providerID: providerModel.providerID,
                },
              },
            },
          );
          if (persistResult.errors.length > 0) {
            const log = await getLogger();
            log.warn(
              `[AgentSession] Assistant message persistence failed for ${conversationSlug}:`,
              persistResult.errors.map((e) => e.message).join(', '),
            );
          }
        } catch (error) {
          const log = await getLogger();
          log.warn(
            `[AgentSession] Assistant message persistence threw for ${conversationSlug}:`,
            error instanceof Error ? error.message : String(error),
          );
        }
      },
    });

    if (!streamResponse.body) {
      responseToReturn = new Response(null, { status: 204 });
      break;
    }

    const wrapStreamWithToolStartFlush = (source: ReadableStream<Uint8Array>) =>
      new ReadableStream<Uint8Array>({
        async start(controller) {
          const buffer: Uint8Array[] = [];
          let streamDone = false;
          const wake = { f: null as (() => void) | null };
          const waitForChunk = (): Promise<void> =>
            new Promise((r) => {
              wake.f = r;
            });

          const reader = source.getReader();
          void (async () => {
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer.push(value);
                const f = wake.f;
                wake.f = null;
                f?.();
              }
            } finally {
              streamDone = true;
              wake.f?.();
              reader.releaseLock();
            }
          })();

          try {
            while (true) {
              while (pendingToolStartChunks.length > 0) {
                const chunk = pendingToolStartChunks.shift();
                if (chunk) controller.enqueue(chunk);
              }
              if (buffer.length > 0) {
                const chunk = buffer.shift()!;
                controller.enqueue(chunk);
              } else if (streamDone) {
                break;
              } else {
                await waitForChunk();
              }
            }
            controller.close();
          } catch (e) {
            controller.error(e);
          }
        },
      });

    const firstUser = messages.find((m) => m.role === 'user');
    const userMessageText = firstUser
      ? (firstUser.parts
          ?.filter((p) => p.type === 'text')
          .map((p) => (p as { text: string }).text)
          .join(' ')
          .trim() ?? '')
      : '';

    if (!shouldGenerateTitle || !userMessageText) {
      responseToReturn = new Response(
        wrapStreamWithToolStartFlush(streamResponse.body),
        {
          headers: SSE_HEADERS,
        },
      );
      break;
    }

    const conv = conversation;
    const baseStream = wrapStreamWithToolStartFlush(streamResponse.body);
    const stream = new ReadableStream({
      async start(controller) {
        const reader = baseStream.getReader();
        const decoder = new TextDecoder();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              controller.close();
              setTimeout(async () => {
                try {
                  const existing =
                    await repositories.message.findByConversationId(conv.id);
                  const userMessages = existing.filter(
                    (msg) => msg.role === MessageRole.USER,
                  );
                  const assistantMessages = existing.filter(
                    (msg) => msg.role === MessageRole.ASSISTANT,
                  );

                  if (
                    userMessages.length !== 1 ||
                    assistantMessages.length !== 1 ||
                    conv.title !== 'New Conversation'
                  ) {
                    return;
                  }

                  const assistantMessage = assistantMessages[0];
                  if (!assistantMessage) return;

                  let assistantText = '';
                  if (
                    typeof assistantMessage.content === 'object' &&
                    assistantMessage.content !== null &&
                    'parts' in assistantMessage.content &&
                    Array.isArray(assistantMessage.content.parts)
                  ) {
                    assistantText = assistantMessage.content.parts
                      .filter(
                        (part): part is { type: 'text'; text: string } =>
                          part.type === 'text',
                      )
                      .map((part) => part.text ?? '')
                      .join(' ')
                      .trim();
                  }

                  if (assistantText) {
                    const title = await generateConversationTitle(
                      userMessageText,
                      assistantText,
                    );
                    if (title && title !== 'New Conversation') {
                      await repositories.conversation.update({
                        ...conv,
                        title,
                        updatedBy: conv.createdBy ?? 'system',
                        updatedAt: new Date(),
                      });
                    }
                  }
                } catch (e) {
                  logger.error('Failed to generate conversation title:', e);
                }
              }, 1000);
              break;
            }

            controller.enqueue(
              new TextEncoder().encode(decoder.decode(value, { stream: true })),
            );
          }
        } catch (e) {
          controller.error(e);
        } finally {
          reader.releaseLock();
        }
      },
    });

    responseToReturn = new Response(stream, { headers: SSE_HEADERS });
    break;
  }

  await SessionCompaction.prune({ conversationSlug, repositories });

  if (responseToReturn !== null) return responseToReturn;
  return new Response(null, { status: 204 });
}

/** Datasource update + invalidation, then loop. Returns a Response with body = ReadableStream (SSE). */
export async function prompt(
  input: AgentSessionPromptInput,
): Promise<Response> {
  const { conversationSlug, datasources, messages, repositories } = input;

  //TODO use usecase to respect clean code principles
  const conversation =
    await repositories.conversation.findBySlug(conversationSlug);

  if (datasources && datasources.length > 0 && conversation) {
    const current = conversation.datasources ?? [];
    const currentSorted = [...current].sort();
    const newSorted = [...datasources].sort();
    const changed =
      currentSorted.length !== newSorted.length ||
      !currentSorted.every((id, i) => id === newSorted[i]);

    if (changed) {
      // TODO use usecase to respect clean code principles
      await repositories.conversation.update({
        ...conversation,
        datasources,
        updatedBy: conversation.createdBy ?? 'system',
        updatedAt: new Date(),
      });
    }
  }

  // Persist the latest user message before loop() so the first messagesApi.stream()
  // includes it; otherwise the agent would reply to the previous turn.
  const lastUserMessage = [...messages]
    .reverse()
    .find((m) => m.role === 'user');
  if (lastUserMessage) {
    const logger = await getLogger();
    const persistence = new MessagePersistenceService(
      repositories.message,
      repositories.conversation,
      conversationSlug,
    );
    try {
      const persistResult = await persistence.persistMessages(
        [lastUserMessage],
        undefined,
        {
          defaultMetadata: {
            agent: input.agentId ?? DEFAULT_AGENT_ID,
          },
        },
      );
      if (persistResult.errors.length > 0) {
        logger.warn(
          `[AgentSession] User message persistence failed for ${conversationSlug}:`,
          persistResult.errors.map((e) => e.message).join(', '),
        );
      }
    } catch (error) {
      logger.warn(
        `[AgentSession] User message persistence threw for ${conversationSlug}:`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  return loop(input);
}
