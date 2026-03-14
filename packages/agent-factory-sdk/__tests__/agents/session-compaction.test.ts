import { describe, expect, it, beforeEach, vi } from 'vitest';
import { generateText } from 'ai';

vi.mock('ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ai')>();
  return {
    ...actual,
    generateText: vi.fn(),
  };
});
import type { Conversation, Message } from '@qwery/domain/entities';
import { MessageRole } from '@qwery/domain/entities';
import type { Repositories } from '@qwery/domain/repositories';
import {
  ConversationRepository,
  MessageRepository,
  UserRepository,
  OrganizationRepository,
  ProjectRepository,
  DatasourceRepository,
  NotebookRepository,
  UsageRepository,
  TodoRepository,
} from '@qwery/repository-in-memory';
import {
  __test__,
  isOverflow,
  prune,
  SessionCompaction,
} from '../../src/agents/session-compaction';

function createRepositories(): Repositories {
  return {
    user: new UserRepository(),
    organization: new OrganizationRepository(),
    project: new ProjectRepository(),
    datasource: new DatasourceRepository(),
    notebook: new NotebookRepository(),
    conversation: new ConversationRepository(),
    message: new MessageRepository(),
    usage: new UsageRepository(),
    todo: new TodoRepository(),
  };
}

const CONV_ID = '11111111-1111-1111-1111-111111111111';
const CONV_SLUG = 'prune-test-conv';

function makeConversation(): Conversation {
  return {
    id: CONV_ID,
    title: 'Test',
    seedMessage: '',
    projectId: '00000000-0000-0000-0000-000000000010',
    taskId: '00000000-0000-0000-0000-000000000020',
    slug: CONV_SLUG,
    datasources: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'test',
    updatedBy: 'test',
    isPublic: false,
  };
}

function makeMessage(
  id: string,
  role: MessageRole,
  content: Message['content'],
  createdAt: Date,
): Message {
  return {
    id,
    conversationId: CONV_ID,
    content,
    role,
    metadata: {},
    createdAt,
    updatedAt: createdAt,
    createdBy: 'test',
    updatedBy: 'test',
  };
}

describe('SessionCompaction prune', () => {
  let repositories: Repositories;

  beforeEach(() => {
    repositories = createRepositories();
  });

  it('does nothing when conversation is not found', async () => {
    const updateSpy = vi.spyOn(repositories.message, 'update');
    await prune({ conversationSlug: 'nonexistent', repositories });
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('does not update when there is only one user message (no older messages)', async () => {
    await repositories.conversation.create(makeConversation());
    const base = new Date(1000);
    await repositories.message.create(
      makeMessage(
        'msg-user-1',
        MessageRole.USER,
        { parts: [{ type: 'text', text: 'hi' }] },
        new Date(base.getTime()),
      ),
    );
    const updateSpy = vi.spyOn(repositories.message, 'update');
    await prune({ conversationSlug: CONV_SLUG, repositories });
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('processes only messages older than last user and prunes when over threshold', async () => {
    await repositories.conversation.create(makeConversation());
    const base = new Date(1000);
    // User0 (0), Asst0 with large tool output (1), User1 (2), Asst1 with large tool output (3), User2 (4)
    // Last user index = 4 (User2). Protection will stop at Asst1 (newest large part),
    // then pruning should apply to older tool output in Asst0.
    const largeOutput = 'x'.repeat(200_000);
    await repositories.message.create(
      makeMessage(
        'msg-user-0',
        MessageRole.USER,
        { parts: [{ type: 'text', text: 'zeroth' }] },
        new Date(base.getTime()),
      ),
    );
    await repositories.message.create(
      makeMessage(
        'msg-asst-0',
        MessageRole.ASSISTANT,
        {
          parts: [
            { type: 'step-start' },
            {
              type: 'tool-runQuery',
              state: 'output-available',
              output: { result: largeOutput },
            },
          ],
        },
        new Date(base.getTime() + 1),
      ),
    );
    await repositories.message.create(
      makeMessage(
        'msg-user-1',
        MessageRole.USER,
        { parts: [{ type: 'text', text: 'first' }] },
        new Date(base.getTime() + 2),
      ),
    );
    await repositories.message.create(
      makeMessage(
        'msg-asst-1',
        MessageRole.ASSISTANT,
        {
          parts: [
            { type: 'step-start' },
            {
              type: 'tool-runQuery',
              state: 'output-available',
              output: { result: largeOutput },
            },
          ],
        },
        new Date(base.getTime() + 3),
      ),
    );
    await repositories.message.create(
      makeMessage(
        'msg-user-2',
        MessageRole.USER,
        { parts: [{ type: 'text', text: 'second' }] },
        new Date(base.getTime() + 4),
      ),
    );

    const updateSpy = vi.spyOn(repositories.message, 'update');
    await prune({ conversationSlug: CONV_SLUG, repositories });

    expect(updateSpy).toHaveBeenCalledTimes(1);
    const [updatedMessage] = updateSpy.mock.calls[0] as [Message];
    expect(updatedMessage.id).toBe('msg-asst-0');
    const parts = (updatedMessage.content as { parts?: unknown[] }).parts ?? [];
    const toolPart = parts.find(
      (p): p is { type?: string; compactedAt?: number } =>
        typeof p === 'object' &&
        p !== null &&
        (p as { type?: string }).type === 'tool-runQuery',
    );
    expect(toolPart).toBeDefined();
    expect(toolPart?.compactedAt).toBeDefined();
    expect(typeof toolPart?.compactedAt).toBe('number');
  });

  it('prunes older assistant outputs even when last message is user', async () => {
    await repositories.conversation.create(makeConversation());
    const base = new Date(1000);
    // User0 (0), Asst0 with large tool output (1), User1 (2), Asst1 with large tool output (3), User2 (4)
    // Last user is User2. Protection will stop at Asst1 (newest large part),
    // and pruning should apply to older tool output in Asst0.
    const largeOutput = 'x'.repeat(200_000);
    await repositories.message.create(
      makeMessage(
        'msg-user-0',
        MessageRole.USER,
        { parts: [{ type: 'text', text: 'zeroth' }] },
        new Date(base.getTime()),
      ),
    );
    await repositories.message.create(
      makeMessage(
        'msg-asst-0',
        MessageRole.ASSISTANT,
        {
          parts: [
            { type: 'step-start' },
            {
              type: 'tool-runQuery',
              state: 'output-available',
              output: { result: largeOutput },
            },
          ],
        },
        new Date(base.getTime() + 1),
      ),
    );
    await repositories.message.create(
      makeMessage(
        'msg-user-1',
        MessageRole.USER,
        { parts: [{ type: 'text', text: 'first' }] },
        new Date(base.getTime() + 2),
      ),
    );
    await repositories.message.create(
      makeMessage(
        'msg-asst-1',
        MessageRole.ASSISTANT,
        {
          parts: [
            { type: 'step-start' },
            {
              type: 'tool-runQuery',
              state: 'output-available',
              output: { result: largeOutput },
            },
          ],
        },
        new Date(base.getTime() + 3),
      ),
    );
    await repositories.message.create(
      makeMessage(
        'msg-user-2',
        MessageRole.USER,
        { parts: [{ type: 'text', text: 'second' }] },
        new Date(base.getTime() + 4),
      ),
    );

    const updateSpy = vi.spyOn(repositories.message, 'update');
    await prune({ conversationSlug: CONV_SLUG, repositories });

    expect(updateSpy).toHaveBeenCalledTimes(1);
    const [updatedMessage] = updateSpy.mock.calls[0] as [Message];
    expect(updatedMessage.id).toBe('msg-asst-0');
    const parts = (updatedMessage.content as { parts?: unknown[] }).parts ?? [];
    const toolPart = parts.find(
      (p): p is { type?: string; compactedAt?: number } =>
        typeof p === 'object' &&
        p !== null &&
        (p as { type?: string }).type === 'tool-runQuery',
    );
    expect(toolPart).toBeDefined();
    expect(toolPart?.compactedAt).toBeDefined();
  });

  it('does not prune messages at or after last user', async () => {
    await repositories.conversation.create(makeConversation());
    const base = new Date(1000);
    // User1 (0), Asst1 no tool (1), User2 (2), Asst2 with large tool output (3)
    // Last user index = 2 (User2). We process indices < 2 => 0, 1 only, so Asst2 is never considered
    const largeOutput = 'x'.repeat(200_000);
    await repositories.message.create(
      makeMessage(
        'msg-user-1',
        MessageRole.USER,
        { parts: [{ type: 'text', text: 'first' }] },
        new Date(base.getTime()),
      ),
    );
    await repositories.message.create(
      makeMessage(
        'msg-asst-1',
        MessageRole.ASSISTANT,
        { parts: [{ type: 'text', text: 'ok' }] },
        new Date(base.getTime() + 1),
      ),
    );
    await repositories.message.create(
      makeMessage(
        'msg-user-2',
        MessageRole.USER,
        { parts: [{ type: 'text', text: 'second' }] },
        new Date(base.getTime() + 2),
      ),
    );
    await repositories.message.create(
      makeMessage(
        'msg-asst-2',
        MessageRole.ASSISTANT,
        {
          parts: [
            {
              type: 'tool-runQuery',
              state: 'output-available',
              output: { result: largeOutput },
            },
          ],
        },
        new Date(base.getTime() + 3),
      ),
    );

    const updateSpy = vi.spyOn(repositories.message, 'update');
    await prune({ conversationSlug: CONV_SLUG, repositories });

    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('stops processing when it hits an assistant message with summary metadata', async () => {
    await repositories.conversation.create(makeConversation());
    const base = new Date(1000);
    // User1 (0), AsstSummary (1), User2 (2). protectedStartIndex = 2. We process 0, then 1.
    // At index 1 we see summary and break, so we never process any parts of AsstSummary.
    const largeOutput = 'x'.repeat(200_000);
    await repositories.message.create(
      makeMessage(
        'msg-user-1',
        MessageRole.USER,
        { parts: [{ type: 'text', text: 'first' }] },
        new Date(base.getTime()),
      ),
    );
    const asstSummary = makeMessage(
      'msg-asst-summary',
      MessageRole.ASSISTANT,
      {
        parts: [
          { type: 'text', text: 'summary' },
          {
            type: 'tool-runQuery',
            state: 'output-available',
            output: { result: largeOutput },
          },
        ],
      },
      new Date(base.getTime() + 1),
    );
    asstSummary.metadata = { summary: true };
    await repositories.message.create(asstSummary);
    await repositories.message.create(
      makeMessage(
        'msg-user-2',
        MessageRole.USER,
        { parts: [{ type: 'text', text: 'second' }] },
        new Date(base.getTime() + 2),
      ),
    );

    const updateSpy = vi.spyOn(repositories.message, 'update');
    await prune({ conversationSlug: CONV_SLUG, repositories });

    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('skips pruning when total prunable tokens are below minimum threshold', async () => {
    await repositories.conversation.create(makeConversation());
    const base = new Date(1000);
    const smallOutput = 'x'.repeat(50_000);
    await repositories.message.create(
      makeMessage(
        'msg-user-0',
        MessageRole.USER,
        { parts: [{ type: 'text', text: 'zeroth' }] },
        new Date(base.getTime()),
      ),
    );
    await repositories.message.create(
      makeMessage(
        'msg-asst-0',
        MessageRole.ASSISTANT,
        {
          parts: [
            { type: 'step-start' },
            {
              type: 'tool-runQuery',
              state: 'output-available',
              output: { result: smallOutput },
            },
          ],
        },
        new Date(base.getTime() + 1),
      ),
    );
    await repositories.message.create(
      makeMessage(
        'msg-user-1',
        MessageRole.USER,
        { parts: [{ type: 'text', text: 'first' }] },
        new Date(base.getTime() + 2),
      ),
    );

    const updateSpy = vi.spyOn(repositories.message, 'update');
    await prune({ conversationSlug: CONV_SLUG, repositories });

    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('propagates errors from generateText in process so callers can handle failures', async () => {
    await repositories.conversation.create(makeConversation());
    const base = new Date(1000);
    const userMessage = makeMessage(
      'msg-user-1',
      MessageRole.USER,
      { parts: [{ type: 'text', text: 'hi' }] },
      new Date(base.getTime()),
    );

    const generateTextMock = vi.mocked(generateText);
    generateTextMock.mockRejectedValueOnce(new Error('compaction-fail'));

    await expect(
      SessionCompaction.process({
        parentID: userMessage.id,
        messages: [userMessage],
        conversationSlug: CONV_SLUG,
        abort: new AbortController().signal,
        auto: true,
        repositories,
      }),
    ).rejects.toThrow('compaction-fail');
  });
});

describe('SessionCompaction helpers', () => {
  it('estimateTokens approximates length with 3.6 divisor and caps at 50k', () => {
    const { estimateTokens } = __test__;
    expect(estimateTokens('')).toBe(0);
    expect(estimateTokens('abcd')).toBeGreaterThanOrEqual(1);
    const longText = 'x'.repeat(400_000);
    expect(estimateTokens(longText)).toBe(50_000);
  });

  it('truncateSummaryByTokens respects max token budget and stops on boundaries', () => {
    const { estimateTokens, truncateSummaryByTokens } = __test__;
    const sentences = [
      'Sentence one. ',
      'Sentence two with more words. ',
      'Sentence three is even longer than the previous ones. ',
      'Sentence four should be cut off when tokens exceed the limit. ',
    ];
    const full = sentences.join('\n');
    const maxTokens = 10;
    const truncated = truncateSummaryByTokens(full, maxTokens);
    const truncatedTokens = estimateTokens(truncated);
    const fullTokens = estimateTokens(full);
    expect(truncatedTokens).toBeLessThanOrEqual(maxTokens);
    expect(fullTokens).toBeGreaterThan(maxTokens);
    expect(truncated.length).toBeGreaterThan(0);
  });

  it('isOverflow returns true only when token count exceeds usable budget', async () => {
    const model = {
      providerID: 'test',
      id: 'test-model',
      limit: { context: 100, output: 20 },
    } as const;
    const below = await isOverflow({
      tokens: {
        input: 40,
        output: 10,
        reasoning: 0,
        cache: { read: 10, write: 0 },
      },
      model,
    });
    // usable = context - output = 80, promptCount = input(40) + cache.read(10) = 50
    expect(below).toBe(false);

    const above = await isOverflow({
      tokens: {
        input: 71,
        output: 0,
        reasoning: 0,
        cache: { read: 10, write: 0 },
      },
      model,
    });
    // usable = 80, promptCount = 81
    expect(above).toBe(true);
  });
});

describe('SessionCompaction isOverflow', () => {
  it('excludes reasoning and output tokens from overflow count (they are stripped between turns)', async () => {
    const model = {
      providerID: 'test',
      id: 'model',
      limit: { context: 100_000, output: 20_000 },
    };

    // usable = 80_000. promptCount = input(40k) + cache.read(20k) = 60k < 80k → no overflow
    // reasoning(1) and output(20k) are excluded: APIs strip them before the next turn
    const overflow = await isOverflow({
      model,
      tokens: {
        input: 40_000,
        output: 20_000,
        reasoning: 1,
        cache: { read: 20_000, write: 0 },
      },
    });

    expect(overflow).toBe(false);
  });

  it('does not overflow when total equals usable limit', async () => {
    const model = {
      providerID: 'test',
      id: 'model',
      limit: { context: 100_000, output: 20_000 },
    };

    const overflow = await isOverflow({
      model,
      tokens: {
        input: 40_000,
        output: 20_000,
        reasoning: 0,
        cache: { read: 20_000, write: 0 },
      },
    });

    expect(overflow).toBe(false);
  });
});
