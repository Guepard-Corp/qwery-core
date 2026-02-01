import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';

import type { TodoItem } from '@qwery/domain/entities';

import { ConversationRepository } from '../src/conversation.repository.js';
import { TodoRepository } from '../src/todo.repository.js';
import { getStorageDir, setStorageDir, resetStorageDir } from '../src/path.js';

function _entityFilePath(conversationId: string): string {
  return path.join(getStorageDir(), 'todo', `${conversationId}.json`);
}

describe('TodoRepository', () => {
  let repository: TodoRepository;
  let conversationRepository: ConversationRepository;
  let testDir: string;
  const conversationId = '550e8400-e29b-41d4-a716-446655440000';
  const projectId = '660e8400-e29b-41d4-a716-446655440000';
  const _organizationId = '760e8400-e29b-41d4-a716-446655440000';

  const createTestTodo = (overrides?: Partial<TodoItem>): TodoItem => ({
    id: overrides?.id ?? 'todo-1',
    content: overrides?.content ?? 'Test task',
    status: overrides?.status ?? 'pending',
    priority: overrides?.priority ?? 'medium',
  });

  beforeEach(async () => {
    testDir = path.join(
      os.tmpdir(),
      `qwery-todo-repo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    );
    await fs.mkdir(testDir, { recursive: true });
    setStorageDir(testDir);
    repository = new TodoRepository();
    conversationRepository = new ConversationRepository();

    await conversationRepository.create({
      id: conversationId,
      title: 'Test Conversation',
      seedMessage: '',
      projectId,
      taskId: '00000000-0000-0000-0000-000000000020',
      slug: 'test-conv',
      datasources: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'test',
      updatedBy: 'test',
      isPublic: false,
    });
  });

  afterEach(() => {
    resetStorageDir();
  });

  describe('findByConversationId', () => {
    it('returns empty array when no todos exist', async () => {
      const todos = await repository.findByConversationId(conversationId);
      expect(todos).toEqual([]);
    });

    it('returns todos after upsert', async () => {
      const todos = [
        createTestTodo(),
        createTestTodo({ id: 'todo-2', content: 'Second task' }),
      ];
      await repository.upsertByConversationId(conversationId, todos);

      const found = await repository.findByConversationId(conversationId);
      expect(found).toEqual(todos);
    });
  });

  describe('upsertByConversationId', () => {
    it('stores and returns todos', async () => {
      const todos = [createTestTodo()];
      const result = await repository.upsertByConversationId(
        conversationId,
        todos,
      );

      expect(result).toEqual(todos);

      const found = await repository.findByConversationId(conversationId);
      expect(found).toEqual(todos);
    });

    it('replaces existing todos on upsert', async () => {
      const initial = [createTestTodo({ id: '1' })];
      await repository.upsertByConversationId(conversationId, initial);

      const updated = [createTestTodo({ id: '2', content: 'Updated' })];
      const result = await repository.upsertByConversationId(
        conversationId,
        updated,
      );

      expect(result).toEqual(updated);

      const found = await repository.findByConversationId(conversationId);
      expect(found).toEqual(updated);
    });
  });
});
