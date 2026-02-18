import { generateText } from 'ai';
import type { Repositories } from '@qwery/domain/repositories';
import { MessageRole } from '@qwery/domain/entities';
import { getLogger } from '@qwery/shared/logger';
import type { Message, MessageContentPart } from '../llm/message';
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
const PRUNE_PROTECTED_TOOL_PREFIXES = ['tool-'];
const PRUNE_PROTECTED_TOOL_STATES = [
  'output-available',
  'output-error',
  'completed',
];

const checkPrune = (part: unknown): boolean => {
  const type = (part as { type?: string }).type ?? '';
  const stateVal = (part as { state?: string | { status?: string } }).state;
  const status = typeof stateVal === 'string' ? stateVal : stateVal?.status;
  const isToolPart =
    PRUNE_PROTECTED_TOOL_PREFIXES.some((prefix) => type.startsWith(prefix)) ||
    type === 'dynamic-tool' ||
    type === 'tool';
  const isPrunableState =
    status !== undefined && PRUNE_PROTECTED_TOOL_STATES.includes(status);
  const compacted =
    (
      part as {
        compactedAt?: number;
        state?: { time?: { compacted?: number } };
      }
    ).compactedAt ??
    (typeof (part as { state?: unknown }).state === 'object' &&
      (part as { state?: { time?: { compacted?: number } } }).state?.time
        ?.compacted);
  return (
    isToolPart &&
    isPrunableState &&
    !PRUNE_PROTECTED_TOOLS.includes((part as { tool?: string }).tool ?? '') &&
    !compacted
  );
};

function estimateTokens(text: string): number {
  const MAX_TOKENS_PER_PART = 50_000;
  return Math.min(Math.ceil((text?.length ?? 0) / 4), MAX_TOKENS_PER_PART);
}

function getPartTokenEstimate(part: {
  type?: string;
  state?: unknown;
  output?: unknown;
}): number {
  const output =
    part.type === 'tool' &&
    typeof part.state === 'object' &&
    part.state !== null &&
    'output' in part.state
      ? (part.state as { output?: unknown }).output
      : (part as { output?: unknown }).output;
  const outputStr =
    typeof output === 'string'
      ? output
      : output && typeof output === 'object' && 'text' in (output as Record<string, unknown>)
        ? String((output as { text?: string }).text ?? '')
        : JSON.stringify(output ?? '');
  return estimateTokens(outputStr);
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
  if (!model?.limit?.context || model.limit.context === 0) {
    return false;
  }
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
  const conversation =
    await repositories.conversation.findBySlug(conversationSlug);
  if (!conversation) return;

  const messages = await repositories.message.findByConversationId(
    conversation.id,
  );

  const userIndices = messages
    .map((m, i) => (m.role === MessageRole.USER ? i : -1))
    .filter((i) => i >= 0);
  const protectedStartIndex =
    userIndices.length >= 1
      ? userIndices[userIndices.length - 1]!
      : messages.length;

  let protectedTokens = 0;
  let shouldStopScanning = false;
  let lastProtectedMsgIndex = -1;
  let lastProtectedPartIndex = -1;

  // Protect the most recent tool outputs (up to PRUNE_PROTECT)
  for (let msgIndex = protectedStartIndex - 1; msgIndex >= 0; msgIndex--) {
    if (shouldStopScanning) break;

    const msg = messages[msgIndex]!;
    const meta = msg.metadata as { summary?: boolean } | undefined;
    if (msg.role === MessageRole.ASSISTANT && meta?.summary) {
      continue;
    }

    const parts = (msg.content as { parts?: unknown[] })?.parts ?? [];
    for (let partIndex = parts.length - 1; partIndex >= 0; partIndex--) {
      const part = parts[partIndex] as {
        type?: string;
        tool?: string;
        state?:
          | string
          | {
              status?: string;
              output?: string;
              time?: { compacted?: number };
              attachments?: unknown[];
            };
        output?: unknown;
      };

      if (!checkPrune(part)) continue;

      const estimate = getPartTokenEstimate(part);

      if (protectedTokens >= PRUNE_PROTECT) {
        shouldStopScanning = true;
        break;
      }

      const wouldExceed = protectedTokens + estimate >= PRUNE_PROTECT;
      protectedTokens += estimate;

      if (wouldExceed) {
        shouldStopScanning = true;
        lastProtectedMsgIndex = msgIndex;
        lastProtectedPartIndex = partIndex;
        break;
      }
    }
  }

  const toPrune: { message: (typeof messages)[number]; partIndex: number }[] =
    [];
  let pruned = 0;

  const pruneStartIndex =
    lastProtectedMsgIndex >= 0
      ? lastProtectedMsgIndex - 1
      : protectedStartIndex - 1;

  // Prune older tool outputs, but never touch the last user turn
  for (let msgIndex = pruneStartIndex; msgIndex >= 0; msgIndex--) {
    const message = messages[msgIndex];
    if (!message) continue;

    const meta = message.metadata as { summary?: boolean } | undefined;
    if (message.role === MessageRole.ASSISTANT && meta?.summary) {
      continue;
    }

    const content = message.content as { parts?: MessageContentPart[] };
    const parts = content.parts ?? [];
    const partStartIndex =
      msgIndex === lastProtectedMsgIndex && lastProtectedPartIndex >= 0
        ? lastProtectedPartIndex - 1
        : parts.length - 1;

    for (let partIndex = partStartIndex; partIndex >= 0; partIndex--) {
      const part = parts[partIndex];
      if (!part || !checkPrune(part)) continue;

      const estimate = getPartTokenEstimate(part);
      toPrune.push({ message, partIndex });
      pruned += estimate;
    }
  }

  if (pruned <= PRUNE_MINIMUM) {
    const logger = await getLogger();
    logger.info(
      `[SessionCompaction] Prune skipped (below minimum): ${pruned} <= ${PRUNE_MINIMUM}`,
      {
        conversationSlug,
        pruned,
        PRUNE_MINIMUM,
      },
    );
    return;
  }

  const logger = await getLogger();
  logger.info('[SessionCompaction] Pruning tool outputs', {
    conversationSlug,
    partsCount: toPrune.length,
    prunedTokens: pruned,
  });

  for (const { message, partIndex } of toPrune) {
    const content = { ...message.content } as { parts?: MessageContentPart[] };
    const parts = [...(content.parts ?? [])];
    const part = parts[partIndex] as Record<string, unknown>;
    if (!part || typeof part !== 'object') continue;

    const now = Date.now();
    const type = String(part.type ?? '');
    const next: Record<string, unknown> = { ...part, compactedAt: now };

    if (type === 'tool') {
      const state = part.state;
      if (typeof state === 'object' && state !== null) {
        const stateObj = state as Record<string, unknown>;
        const time = stateObj.time;
        const nextTime =
          typeof time === 'object' && time !== null
            ? { ...(time as Record<string, unknown>), compacted: now }
            : { compacted: now };
        next.state = {
          ...stateObj,
          time: nextTime,
          output: '[Old tool result content cleared]',
          attachments: [],
        };
      }
    } else if (Object.hasOwn(part, 'output')) {
      next.output = '[Old tool result content cleared]';
    }

    parts[partIndex] = next as MessageContentPart;

    await repositories.message.update({
      ...message,
      content: { ...content, parts } as typeof message.content,
      updatedAt: new Date(),
      updatedBy: message.updatedBy ?? 'system',
    });
  }
}

export type ProcessInput = {
  parentID: string;
  messages: Message[];
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
  const {
    parentID,
    messages,
    conversationSlug,
    abort,
    auto: _auto,
    repositories,
  } = input;

  const logger = await getLogger();
  const compactionAgent = Registry.agents.get('compaction');
  if (!compactionAgent) {
    return 'continue';
  }

  const lastUser = messages.findLast((m) => m.id === parentID);
  if (!lastUser) {
    return 'continue';
  }

  const userMeta = lastUser.metadata as
    | {
        model?: { providerID: string; modelID: string };
      }
    | undefined;
  const modelStr = userMeta?.model
    ? `${userMeta.model.providerID}/${userMeta.model.modelID}`
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

    const summaryText = result.text.trim();
    const assistantMsg = {
      id: uuidv4(),
      role: 'assistant' as const,
      parts: [{ type: 'text' as const, text: summaryText }],
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

    await persistence.persistMessages([assistantMsg], undefined, {
      defaultMetadata: {
        modelId: model.id,
        providerId: model.providerID,
        agent: 'compaction',
      },
    });
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

  const conversation =
    await repositories.conversation.findBySlug(conversationSlug);
  if (!conversation) return;

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
