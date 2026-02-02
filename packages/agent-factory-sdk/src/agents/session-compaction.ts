import { generateText } from 'ai';
import type { Repositories } from '@qwery/domain/repositories';
import { MessageRole } from '@qwery/domain/entities';
import { getLogger } from '@qwery/shared/logger';
import type { WithParts } from '../llm/message';
import { Provider } from '../llm/provider';
import { Messages } from '../llm/message';
import { MessagePersistenceService } from '../services/message-persistence.service';
import { CreateMessageService } from '@qwery/domain/services';
import { Registry } from '../tools/registry';
import { COMPACTION_PROMPT } from './prompts/compaction.prompt';
import { v4 as uuidv4 } from 'uuid';

const OUTPUT_TOKEN_MAX = 32_000;
const PRUNE_MINIMUM = 20_000;
const PRUNE_PROTECT = 40_000;
const PRUNE_PROTECTED_TOOLS = ['skill'];

function estimateTokens(text: string): number {
  return Math.ceil((text?.length ?? 0) / 4);
}

export type IsOverflowInput = {
  tokens: {
    input: number;
    output: number;
    reasoning: number;
    cache: { read: number; write: number };
  };
  model?:
    | string
    | {
        providerID: string;
        id: string;
        limit?: { context: number; output: number; input?: number };
      };
};

export async function isOverflow(input: IsOverflowInput): Promise<boolean> {
  const model =
    typeof input.model === 'string'
      ? Provider.getModelFromString(input.model)
      : input.model;
  if (!model?.limit?.context || model.limit.context === 0) return false;
  const context = model.limit.context;
  const outputLimit =
    Math.min(model.limit.output ?? Infinity, OUTPUT_TOKEN_MAX) ||
    OUTPUT_TOKEN_MAX;
  const usable = model.limit.input ?? context - outputLimit;
  const count =
    input.tokens.input + input.tokens.cache.read + input.tokens.output;
  const overflow = count > usable;
  if (overflow) {
    const logger = await getLogger();
    logger.info('[SessionCompaction] Context overflow detected', {
      count,
      usable,
      context,
    });
  }
  return overflow;
}

export type PruneInput = {
  conversationSlug: string;
  repositories: Repositories;
};

export async function prune(input: PruneInput): Promise<void> {
  const { conversationSlug, repositories } = input;
  const logger = await getLogger();
  const conversation =
    await repositories.conversation.findBySlug(conversationSlug);
  if (!conversation) return;
  logger.info('[SessionCompaction] Prune started', { conversationSlug });

  const messages = await repositories.message.findByConversationId(
    conversation.id,
  );
  let total = 0;
  let pruned = 0;
  const toPrune: { message: (typeof messages)[number]; partIndex: number }[] =
    [];
  let turns = 0;

  loop: for (let msgIndex = messages.length - 1; msgIndex >= 0; msgIndex--) {
    const msg = messages[msgIndex]!;
    if (msg.role === MessageRole.USER) turns++;
    if (turns < 2) continue;
    const meta = msg.metadata as { summary?: boolean } | undefined;
    if (msg.role === MessageRole.ASSISTANT && meta?.summary) break loop;

    const parts = (msg.content as { parts?: unknown[] })?.parts ?? [];
    for (let partIndex = parts.length - 1; partIndex >= 0; partIndex--) {
      const part = parts[partIndex] as {
        type?: string;
        tool?: string;
        state?: {
          status?: string;
          output?: string;
          time?: { compacted?: number };
        };
      };
      if (
        part?.type === 'tool' &&
        part.state?.status === 'completed' &&
        !PRUNE_PROTECTED_TOOLS.includes(part.tool ?? '') &&
        !part.state.time?.compacted
      ) {
        const estimate = estimateTokens(part.state.output ?? '');
        total += estimate;
        if (total > PRUNE_PROTECT) {
          pruned += estimate;
          toPrune.push({ message: msg, partIndex });
        }
      }
    }
  }

  if (pruned <= PRUNE_MINIMUM) {
    logger.info('[SessionCompaction] Prune skipped (below minimum)', {
      conversationSlug,
      pruned,
      PRUNE_MINIMUM,
    });
    return;
  }

  logger.info('[SessionCompaction] Pruning tool outputs', {
    conversationSlug,
    partsCount: toPrune.length,
    prunedTokens: pruned,
  });

  for (const { message, partIndex } of toPrune) {
    const content = { ...message.content } as { parts?: unknown[] };
    const parts = [...(content.parts ?? [])];
    const part = parts[partIndex] as Record<string, unknown>;
    if (
      part &&
      typeof part === 'object' &&
      part.state &&
      typeof part.state === 'object'
    ) {
      parts[partIndex] = {
        ...part,
        state: {
          ...(part.state as Record<string, unknown>),
          time: {
            ...((part.state as Record<string, unknown>).time as Record<
              string,
              unknown
            >),
            compacted: Date.now(),
          },
        },
      };
      await repositories.message.update({
        ...message,
        content: { ...content, parts } as typeof message.content,
        updatedAt: new Date(),
        updatedBy: message.updatedBy ?? 'system',
      });
    }
  }
}

export type ProcessInput = {
  parentID: string;
  messages: WithParts[];
  conversationSlug: string;
  abort: AbortSignal;
  auto: boolean;
  repositories: Repositories;
};

const COMPACTION_USER_PROMPT =
  "Provide a detailed prompt for continuing our conversation above. Focus on information that would be helpful for continuing the conversation, including what we did, what we're doing, which datasources we're using, and what we're going to do next considering the new context will not have access to our full conversation history.";

export async function process(
  input: ProcessInput,
): Promise<'stop' | 'continue'> {
  const { parentID, messages, conversationSlug, abort, auto, repositories } =
    input;

  const logger = await getLogger();
  logger.info('[SessionCompaction] Process started', {
    conversationSlug,
    parentID,
    auto,
  });

  const compactionAgent = Registry.agents.get('compaction');
  if (!compactionAgent) {
    logger.info(
      '[SessionCompaction] Compaction agent not registered, skipping',
    );
    return 'continue';
  }

  const lastUser = messages.findLast((m) => m.info.id === parentID);
  if (!lastUser) {
    logger.info('[SessionCompaction] Last user message not found, skipping');
    return 'continue';
  }

  const userInfo = lastUser.info as {
    model?: { providerID: string; modelID: string };
  };
  const modelStr = userInfo?.model
    ? `${userInfo.model.providerID}/${userInfo.model.modelID}`
    : undefined;
  const model = modelStr
    ? Provider.getModelFromString(modelStr)
    : Provider.getDefaultModel();

  const modelMessages = await Messages.toModelMessages(messages, model);
  const compactionMessages = [
    ...modelMessages,
    {
      role: 'user' as const,
      content: [{ type: 'text' as const, text: COMPACTION_USER_PROMPT }],
    },
  ];

  try {
    const result = await generateText({
      model: await Provider.getLanguage(model),
      messages: compactionMessages,
      system: COMPACTION_PROMPT,
      abortSignal: abort,
    });

    const conversation =
      await repositories.conversation.findBySlug(conversationSlug);
    if (!conversation) return 'stop';

    const persistence = new MessagePersistenceService(
      repositories.message,
      repositories.conversation,
      conversationSlug,
    );

    const assistantMsg = {
      id: uuidv4(),
      role: 'assistant' as const,
      parts: [{ type: 'text' as const, text: result.text.trim() }],
      metadata: {
        summary: true,
        finish: 'stop',
        parentId: parentID,
        tokens: {
          input:
            (result.usage as { inputTokens?: number; promptTokens?: number })
              ?.inputTokens ??
            (result.usage as { promptTokens?: number })?.promptTokens ??
            0,
          output:
            (
              result.usage as {
                outputTokens?: number;
                completionTokens?: number;
              }
            )?.outputTokens ??
            (result.usage as { completionTokens?: number })?.completionTokens ??
            0,
          reasoning: 0,
          cache: { read: 0, write: 0 },
        },
      },
    };

    await persistence.persistMessages([assistantMsg]);

    logger.info('[SessionCompaction] Summary persisted', {
      conversationSlug,
      auto,
      summaryTokens: assistantMsg.metadata.tokens,
    });

    if (auto) {
      const continueUserMsg = {
        id: uuidv4(),
        role: 'user' as const,
        parts: [
          {
            type: 'text' as const,
            text: 'Continue if you have next steps',
            synthetic: true,
          },
        ],
      };
      await persistence.persistMessages([continueUserMsg]);
    }
  } catch (err) {
    logger.warn(
      '[SessionCompaction] Process failed',
      err instanceof Error ? err.message : String(err),
    );
    return 'stop';
  }
  return 'continue';
}

export type CreateInput = {
  conversationSlug: string;
  agent: string;
  model: string | { providerID: string; modelID: string };
  auto: boolean;
  repositories: Repositories;
};

export async function create(input: CreateInput): Promise<void> {
  const { conversationSlug, agent, model, auto, repositories } = input;

  const logger = await getLogger();
  const conversation =
    await repositories.conversation.findBySlug(conversationSlug);
  if (!conversation) return;

  logger.info('[SessionCompaction] Compaction task created', {
    conversationSlug,
    agent,
    auto,
  });

  const modelObj =
    typeof model === 'string' ? Provider.getModelFromString(model) : model;
  const modelMeta =
    typeof modelObj === 'object' &&
    modelObj !== null &&
    'providerID' in modelObj
      ? {
          providerID: modelObj.providerID,
          modelID:
            'id' in modelObj && typeof modelObj.id === 'string'
              ? modelObj.id
              : ((modelObj as { modelID?: string }).modelID ?? ''),
        }
      : undefined;

  const useCase = new CreateMessageService(
    repositories.message,
    repositories.conversation,
  );

  await useCase.execute({
    input: {
      content: {
        id: uuidv4(),
        role: 'user',
        parts: [{ type: 'compaction', auto }],
      },
      role: MessageRole.USER,
      metadata: { agent, model: modelMeta },
      createdBy: conversation.createdBy ?? 'system',
    },
    conversationSlug,
  });
}

export const SessionCompaction = {
  isOverflow,
  prune,
  process,
  create,
};
