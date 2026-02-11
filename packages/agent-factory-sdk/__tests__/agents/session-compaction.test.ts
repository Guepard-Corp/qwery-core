import { describe, expect, it, beforeEach, vi } from 'vitest';
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
import { prune } from '../../src/agents/session-compaction';

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
    // User0 (0), Asst0 with large tool output (1), User1 (2), Asst1 (3), User2 (4)
    // Last user index = 4 (User2). We process indices < 4 => 0, 1, 2, 3 (User0, Asst0, User1, Asst1).
    // estimateTokens = ceil(len/4). 200_000 chars => 50_000 tokens > PRUNE_PROTECT (40k) and pruned > PRUNE_MINIMUM (20k)
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
        { parts: [{ type: 'text', text: 'ok' }] },
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

  it('prunes previous assistant when current user just sent (simulates prune before stream persist)', async () => {
    await repositories.conversation.create(makeConversation());
    const base = new Date(1000);
    // Production scenario: User1 (0), Asst1 with large tool output (1), User2 (2) – no Asst2 yet
    // Last user index = 2. We process indices < 2 => User1, Asst1. Asst1 is pruned.
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
        'msg-user-2',
        MessageRole.USER,
        { parts: [{ type: 'text', text: 'second' }] },
        new Date(base.getTime() + 2),
      ),
    );

    const updateSpy = vi.spyOn(repositories.message, 'update');
    await prune({ conversationSlug: CONV_SLUG, repositories });

    expect(updateSpy).toHaveBeenCalledTimes(1);
    const [updatedMessage] = updateSpy.mock.calls[0] as [Message];
    expect(updatedMessage.id).toBe('msg-asst-1');
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
});
