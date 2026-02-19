import { type UIMessage, convertToModelMessages, validateUIMessages } from 'ai';
import { v4 as uuidv4 } from 'uuid';
import type { Repositories } from '@qwery/domain/repositories';
import { insertReminders } from './insert-reminders';
import { Registry } from '../tools/registry';
import type { AskRequest, ToolContext, ToolMetadataInput } from '../tools/tool';
import { LLM, type StreamInput } from '../llm/llm';
import type { Message } from '../llm/message';
import {
  messageRoleToUIRole,
  uiRoleToMessageRole,
} from '@qwery/shared/message-role-utils';
import { Provider } from '../llm/provider';
import { MessagePersistenceService } from '../services/message-persistence.service';
import { UsagePersistenceService } from '../services/usage-persistence.service';
import { getLogger } from '@qwery/shared/logger';
import { getDefaultModel } from '../services/model-resolver';
import { loadDatasources } from '../tools/datasource-loader';
import type { Datasource } from '@qwery/domain/entities';

export type RunAgentToCompletionInput = {
  conversationId: string;
  conversationSlug: string;
  messages: UIMessage[];
  agentId: string;
  model?: string;
  repositories: Repositories;
  abortSignal: AbortSignal;
  maxSteps?: number;
  datasources?: string[];
  mcpServerUrl?: string;
  onAsk?: (req: AskRequest) => Promise<void>;
  onToolMetadata?: (input: ToolMetadataInput) => void | Promise<void>;
};

export type RunAgentToCompletionResult = {
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  messages: UIMessage[];
};

export async function runAgentToCompletion(
  input: RunAgentToCompletionInput,
): Promise<RunAgentToCompletionResult> {
  const logger = await getLogger();
  const {
    conversationId,
    conversationSlug,
    messages,
    agentId,
    model: modelInput,
    repositories,
    abortSignal,
    maxSteps = 5,
    datasources,
    mcpServerUrl,
    onAsk,
    onToolMetadata,
  } = input;

  const agentInfo = Registry.agents.get(agentId);
  if (!agentInfo) {
    throw new Error(`Agent not found: ${agentId}`);
  }

  const loadedDatasources = await loadDatasources(
    datasources ?? [],
    repositories.datasource,
  );

  const model =
    typeof modelInput === 'string' && modelInput
      ? Provider.getModelFromString(modelInput)
      : Provider.getDefaultModel();
  const modelForRegistry = {
    providerId: model.providerID,
    modelId: model.id,
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
    abort: options.abortSignal ?? abortSignal,
    extra: {
      repositories,
      conversationId,
      metadataDatasources: datasources,
    },
    messages: [],
    ask: async (req: AskRequest) => {
      await onAsk?.(req);
    },
    metadata: async (meta: ToolMetadataInput) => {
      await onToolMetadata?.(meta);
    },
  });

  const { tools, close: closeMcp } = await Registry.tools.forAgent(
    agentId,
    modelForRegistry,
    getContext,
    { mcpServerUrl },
  );

  const reminderContext = {
    attachedDatasourceNames: loadedDatasources.map((d: Datasource) => d.name),
  };
  const now = new Date();
  const msgsAsMessages: Message[] = messages.map((m) => ({
    id: m.id,
    conversationId,
    content: { parts: m.parts },
    role: uiRoleToMessageRole(m.role),
    metadata: (m.metadata as Record<string, unknown>) ?? {},
    createdAt: now,
    updatedAt: now,
    createdBy: 'system',
    updatedBy: 'system',
  }));
  const msgsWithReminders = insertReminders({
    messages: msgsAsMessages,
    agent: agentInfo,
    context: reminderContext,
  });

  const validated = await validateUIMessages({
    messages: msgsWithReminders.map((m) => ({
      id: m.id,
      role: messageRoleToUIRole(m.role),
      parts: m.content?.parts ?? [],
    })),
  });

  const messagesForLlm =
    msgsWithReminders.length > 0
      ? (msgsWithReminders as StreamInput['messages'])
      : ((await convertToModelMessages(validated, {
          tools,
        })) as StreamInput['messages']);

  const result = await LLM.stream({
    model,
    messages: messagesForLlm,
    tools,
    maxSteps,
    abortSignal,
    systemPrompt: agentInfo.systemPrompt,
    onFinish: closeMcp
      ? async () => {
          await closeMcp();
        }
      : undefined,
  });

  let finishedMessages: UIMessage[] = [];
  const response = result.toUIMessageStreamResponse({
    generateMessageId: () => uuidv4(),
    onFinish: ({ messages: completed }) => {
      finishedMessages = completed;
    },
  });

  if (response.body) {
    await response.body.pipeTo(new WritableStream({ write: () => {} }));
  }

  const text = await result.text;

  const usagePromise = result.usage;
  let usage: RunAgentToCompletionResult['usage'] = undefined;
  let rawUsage: import('ai').LanguageModelUsage | undefined = undefined;
  if (usagePromise) {
    try {
      const raw = (await usagePromise) as
        | {
            inputTokens?: number;
            outputTokens?: number;
            promptTokens?: number;
            completionTokens?: number;
          }
        | null
        | undefined;
      if (raw) {
        rawUsage = raw as import('ai').LanguageModelUsage;
        const inputTokens =
          'inputTokens' in raw
            ? (raw.inputTokens ?? 0)
            : 'promptTokens' in raw
              ? (raw.promptTokens ?? 0)
              : 0;
        const outputTokens =
          'outputTokens' in raw
            ? (raw.outputTokens ?? 0)
            : 'completionTokens' in raw
              ? (raw.completionTokens ?? 0)
              : 0;
        usage = {
          promptTokens: inputTokens,
          completionTokens: outputTokens,
          totalTokens: inputTokens + outputTokens,
        };
      }
    } catch {
      // ignore
    }
  }

  const modelString = modelInput ?? getDefaultModel();
  let userId = 'system';
  try {
    const conversation =
      (await repositories.conversation.findBySlug(conversationSlug)) ??
      (await repositories.conversation.findById(conversationId));
    if (conversation?.createdBy?.trim()) {
      userId = conversation.createdBy;
    }
  } catch {
    // keep default 'system'
  }
  const usagePersistenceService = new UsagePersistenceService(
    repositories.usage,
    repositories.conversation,
    repositories.project,
    conversationSlug,
  );
  if (rawUsage) {
    usagePersistenceService
      .persistUsage(
        rawUsage as import('ai').LanguageModelUsage,
        modelString,
        userId,
      )
      .catch(async (error) => {
        const log = await getLogger();
        log.error('[RunAgentToCompletion] Failed to persist usage:', error);
      });
  }

  const persistence = new MessagePersistenceService(
    repositories.message,
    repositories.conversation,
    conversationSlug,
  );
  try {
    const persistResult = await persistence.persistMessages(
      finishedMessages,
      undefined,
      {
        defaultMetadata: {
          agent: agentId,
          model: {
            modelID: model.id,
            providerID: model.providerID,
          },
        },
      },
    );
    if (persistResult.errors.length > 0) {
      logger.warn(
        '[RunAgentToCompletion] Message persistence had errors:',
        persistResult.errors.map((e) => e.message).join(', '),
      );
    }
  } catch (error) {
    logger.warn(
      '[RunAgentToCompletion] Message persistence threw:',
      error instanceof Error ? error.message : String(error),
    );
  }

  return {
    text,
    usage,
    messages: finishedMessages,
  };
}
