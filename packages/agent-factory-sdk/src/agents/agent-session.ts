import { type UIMessage, convertToModelMessages, validateUIMessages } from 'ai';
import { getDefaultModel } from '../services/model-resolver';
import { generateConversationTitle } from '../services/generate-conversation-title.service';
import { MessagePersistenceService } from '../services/message-persistence.service';
import { UsagePersistenceService } from '../services/usage-persistence.service';
import type { Repositories } from '@qwery/domain/repositories';
import type { TelemetryManager } from '@qwery/telemetry/otel';
import { MessageRole } from '@qwery/domain/entities';
import { createMessages, filterCompacted } from '../llm/message';
import type { WithParts } from '../llm/message';
import type { Part } from '../llm/message';
import { SessionCompaction } from './session-compaction';
import { getLogger } from '@qwery/shared/logger';
import { Registry } from '../tools/registry';
import type { AskRequest, ToolContext, ToolMetadataInput } from '../tools/tool';
import { createQueryEngine } from '@qwery/domain/ports';
import { DuckDBQueryEngine } from '../services/duckdb-query-engine.service';
import {
  DatasourceOrchestrationService,
  type DatasourceOrchestrationResult,
} from '../tools/datasource-orchestration-service';
import { getSchemaCache } from '../tools/schema-cache';
import { getDatasourceDatabaseName } from '../tools/datasource-name-utils';
import { insertReminders } from './insert-reminders';
import { LLM } from '../llm/llm';
import { Provider } from '../llm/provider';
import { v4 as uuidv4 } from 'uuid';

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
};

const DEFAULT_AGENT_ID = 'query';

const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  Connection: 'keep-alive',
} as const;

function ensureTitle(_opts: {
  conversationSlug: string;
  conversationId: string;
  model: string;
  msgs: WithParts[];
  repositories: Repositories;
}): void {
  // Placeholder: actual title logic runs on stream close.
}

function deriveState(msgs: WithParts[]) {
  const lastUser = msgs.findLast((m: WithParts) => m.info.role === 'user');
  const lastAssistant = msgs.findLast(
    (m: WithParts) => m.info.role === 'assistant',
  );
  const lastFinished = msgs.findLast(
    (m: WithParts) =>
      m.info.role === 'assistant' && !!(m.info as { finish?: string }).finish,
  );
  const tasks = msgs
    .flatMap((m: WithParts) => m.parts)
    .filter((p): p is Part => p.type === 'compaction' || p.type === 'subtask');
  return { lastUser, lastAssistant, lastFinished, tasks };
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
  } = input;
  const agentId = inputAgentId ?? DEFAULT_AGENT_ID;

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
    const { lastUser, lastAssistant, lastFinished, tasks } = deriveState(msgs);

    const finish = lastAssistant
      ? (lastAssistant.info as { finish?: string }).finish
      : undefined;
    const exitCondition =
      lastAssistant &&
      finish &&
      finish !== 'tool-calls' &&
      finish !== 'unknown' &&
      lastUser &&
      lastUser.info.id < lastAssistant.info.id;
    if (exitCondition) {
      break;
    }

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
        parentID: lastUser?.info.id ?? '',
        messages: msgs,
        conversationSlug,
        abort: abortController.signal,
        auto: (task as { auto: boolean }).auto,
      });
      if (result === 'stop') break;
      continue;
    }

    const lastFinishedSummary = lastFinished
      ? (lastFinished.info as { summary?: boolean }).summary
      : undefined;
    const lastFinishedTokens = lastFinished
      ? (
          lastFinished.info as {
            tokens?: {
              input: number;
              output: number;
              reasoning: number;
              cache: { read: number; write: number };
            };
          }
        ).tokens
      : undefined;
    if (
      lastFinished &&
      !lastFinishedSummary &&
      lastFinishedTokens &&
      (await SessionCompaction.isOverflow({
        tokens: lastFinishedTokens,
        model,
      }))
    ) {
      const userInfo = lastUser?.info as {
        agent?: string;
        model?: { providerID: string; modelID: string };
      };
      await SessionCompaction.create({
        conversationSlug,
        agent: userInfo?.agent ?? '',
        model: userInfo?.model ?? { providerID: '', modelID: model },
        auto: true,
      });
      continue;
    }

    const shouldGenerateTitle =
      conversation.title === 'New Conversation' && generateTitle;

    const agentInfo = Registry.agents.get(agentId);
    if (!agentInfo) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    const queryEngine = createQueryEngine(DuckDBQueryEngine);
    const datasourceOrchestrationService = new DatasourceOrchestrationService();
    let orchestrationResult: DatasourceOrchestrationResult;
    try {
      orchestrationResult = await datasourceOrchestrationService.orchestrate({
        conversationId,
        conversationSlug,
        repositories,
        queryEngine,
        metadataDatasources: input.datasources,
      });
    } catch (error) {
      logger.warn(
        '[AgentSession] Orchestration failed, tools may lack datasource context:',
        error instanceof Error ? error.message : String(error),
      );
      const workspace =
        typeof process !== 'undefined' && process?.env?.WORKSPACE
          ? process.env.WORKSPACE
          : undefined;
      if (!workspace) {
        throw new Error('WORKSPACE environment variable is not set');
      }
      orchestrationResult = {
        conversation: null,
        datasources: [],
        workspace,
        schemaCache: getSchemaCache(conversationId),
        attached: false,
      };
    }

    const providerModel =
      typeof model === 'string'
        ? Provider.getModelFromString(model)
        : Provider.getDefaultModel();
    const modelForRegistry = {
      providerId: providerModel.providerID,
      modelId: providerModel.id,
    };

    const assistantMessageId = uuidv4();
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
        queryEngine,
        conversationId,
        orchestrationResult,
        metadataDatasources: input.datasources,
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
    });

    const tools = await Registry.tools.forAgent(
      agentId,
      modelForRegistry,
      getContext,
    );

    const reminderContext = {
      attachedDatasourceNames: orchestrationResult.datasources.map((d) =>
        getDatasourceDatabaseName(d.datasource),
      ),
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

    // Persist the last user message before processing (for web UI; idempotent)
    const lastUserMessage = [...messages]
      .reverse()
      .find((m) => m.role === 'user');
    if (lastUserMessage) {
      const persistence = new MessagePersistenceService(
        repositories.message,
        repositories.conversation,
        conversationSlug,
      );
      try {
        const persistResult = await persistence.persistMessages([
          lastUserMessage,
        ]);
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

    const result = await LLM.stream({
      model,
      messages: messagesForLlm,
      tools,
      maxSteps: inputMaxSteps ?? agentInfo.steps ?? 5,
      abortSignal: abortController.signal,
      systemPrompt: agentInfo.systemPrompt,
    });

    const streamResponse = result.toUIMessageStreamResponse({
      generateMessageId: () => uuidv4(),
      onFinish: async ({ messages: finishedMessages }) => {
        const totalUsage = await result.totalUsage;
        const usagePersistenceService = new UsagePersistenceService(
          repositories.usage,
          repositories.conversation,
          repositories.project,
          conversationSlug,
        );
        usagePersistenceService
          .persistUsage(totalUsage, model)
          .catch(async (error) => {
            const log = await getLogger();
            log.error('[AgentSession] Failed to persist usage:', error);
          });

        const persistence = new MessagePersistenceService(
          repositories.message,
          repositories.conversation,
          conversationSlug,
        );
        try {
          const persistResult =
            await persistence.persistMessages(finishedMessages);
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

    const firstUser = messages.find((m) => m.role === 'user');
    const userMessageText = firstUser
      ? (firstUser.parts
          ?.filter((p) => p.type === 'text')
          .map((p) => (p as { text: string }).text)
          .join(' ')
          .trim() ?? '')
      : '';

    if (!shouldGenerateTitle || !userMessageText) {
      responseToReturn = new Response(streamResponse.body, {
        headers: SSE_HEADERS,
      });
      break;
    }

    const conv = conversation;
    const stream = new ReadableStream({
      async start(controller) {
        const reader = streamResponse.body!.getReader();
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
                      .filter((part: { type?: string }) => part.type === 'text')
                      .map((part: { text?: string }) => part.text ?? '')
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

  await SessionCompaction.prune({ conversationSlug });

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
      const persistResult = await persistence.persistMessages([
        lastUserMessage,
      ]);
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
