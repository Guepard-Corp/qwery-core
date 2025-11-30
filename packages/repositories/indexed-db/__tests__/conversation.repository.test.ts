import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { Conversation } from '@qwery/domain/entities';

import { ConversationRepository } from '../src/conversation.repository';

describe('ConversationRepository', () => {
  let repository: ConversationRepository;
  const testDbName = 'test-conversations';

  beforeEach(async () => {
    repository = new ConversationRepository(testDbName);
    await repository.close();
    await new Promise<void>((resolve, reject) => {
      const deleteRequest = indexedDB.deleteDatabase(testDbName);
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
    });
    repository = new ConversationRepository(testDbName);
  });

  afterEach(async () => {
    await repository.close();
    await new Promise<void>((resolve, reject) => {
      const deleteRequest = indexedDB.deleteDatabase(testDbName);
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
    });
  });

  const createTestConversation = (
    overrides?: Partial<Conversation>,
  ): Conversation => {
    const id = overrides?.id || '550e8400-e29b-41d4-a716-446655440000';
    return {
      id,
      projectId: overrides?.projectId || '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      taskId: overrides?.taskId || '7ba7b810-9dad-11d1-80b4-00c04fd430c8',
      title: overrides?.title || 'Test Conversation',
      slug: repository.shortenId(id),
      datasources: overrides?.datasources || [],
      createdAt: overrides?.createdAt || new Date('2024-01-01T00:00:00Z'),
      updatedAt: overrides?.updatedAt || new Date('2024-01-01T00:00:00Z'),
      createdBy: overrides?.createdBy || 'test-user',
      updatedBy: overrides?.updatedBy || 'test-user',
      ...overrides,
    };
  };

  describe('create', () => {
    it('should create a new conversation', async () => {
      const conversation = createTestConversation();
      const result = await repository.create(conversation);

      expect(result.id).toBe(conversation.id);
      expect(result.title).toBe(conversation.title);
      expect(result.slug).toBe(repository.shortenId(conversation.id));
      expect(result.slug.length).toBeGreaterThanOrEqual(8);
      expect(result.projectId).toBe(conversation.projectId);
      expect(result.taskId).toBe(conversation.taskId);
      expect(result.datasources).toEqual(conversation.datasources);
    });

    it('should automatically generate slug from id', async () => {
      const conversation = createTestConversation({
        slug: 'should-be-overridden',
      });
      const result = await repository.create(conversation);

      expect(result.slug).toBe(repository.shortenId(conversation.id));
      expect(result.slug).not.toBe('should-be-overridden');
    });

    it('should throw error when creating duplicate conversation', async () => {
      const conversation = createTestConversation();
      await repository.create(conversation);

      await expect(repository.create(conversation)).rejects.toThrow(
        'already exists',
      );
    });

    it('should handle empty datasources array', async () => {
      const conversation = createTestConversation({
        datasources: [],
      });
      const result = await repository.create(conversation);

      expect(result.datasources).toEqual([]);
    });

    it('should handle datasources array', async () => {
      const conversation = createTestConversation({
        datasources: ['ds1', 'ds2', 'ds3'],
      });
      const result = await repository.create(conversation);

      expect(result.datasources).toEqual(['ds1', 'ds2', 'ds3']);
      expect(result.datasources).toHaveLength(3);
    });
  });

  describe('findById', () => {
    it('should find a conversation by id', async () => {
      const conversation = createTestConversation();
      await repository.create(conversation);

      const result = await repository.findById(conversation.id);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(conversation.id);
      expect(result?.title).toBe(conversation.title);
      expect(result?.slug).toBe(repository.shortenId(conversation.id));
      expect(result?.projectId).toBe(conversation.projectId);
      expect(result?.taskId).toBe(conversation.taskId);
      expect(result?.createdAt).toBeInstanceOf(Date);
      expect(result?.updatedAt).toBeInstanceOf(Date);
    });

    it('should return null when conversation not found', async () => {
      const result = await repository.findById('non-existent-id');
      expect(result).toBeNull();
    });
  });

  describe('findBySlug', () => {
    it('should find a conversation by slug', async () => {
      const conversation = createTestConversation();
      await repository.create(conversation);

      const result = await repository.findBySlug(conversation.slug);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(conversation.id);
      expect(result?.title).toBe(conversation.title);
      expect(result?.slug).toBe(conversation.slug);
    });

    it('should return null when conversation not found by slug', async () => {
      const result = await repository.findBySlug('non-existent-slug');
      expect(result).toBeNull();
    });
  });

  describe('findByProjectId', () => {
    it('should find conversations by project id', async () => {
      const projectId1 = '550e8400-e29b-41d4-a716-446655440000';
      const projectId2 = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

      const conversation1 = createTestConversation({
        id: '550e8400-e29b-41d4-a716-446655440001',
        projectId: projectId1,
      });
      const conversation2 = createTestConversation({
        id: '550e8400-e29b-41d4-a716-446655440002',
        projectId: projectId1,
      });
      const conversation3 = createTestConversation({
        id: '550e8400-e29b-41d4-a716-446655440003',
        projectId: projectId2,
      });

      await repository.create(conversation1);
      await repository.create(conversation2);
      await repository.create(conversation3);

      const result = await repository.findByProjectId(projectId1);

      expect(result).toHaveLength(2);
      expect(result.map((c) => c.id)).toContain(conversation1.id);
      expect(result.map((c) => c.id)).toContain(conversation2.id);
      expect(result.map((c) => c.id)).not.toContain(conversation3.id);
    });

    it('should return empty array when project has no conversations', async () => {
      const result = await repository.findByProjectId('nonexistent-project-id');
      expect(result).toEqual([]);
    });
  });

  describe('findByTaskId', () => {
    it('should find conversations by task id', async () => {
      const taskId1 = '550e8400-e29b-41d4-a716-446655440000';
      const taskId2 = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

      const conversation1 = createTestConversation({
        id: '550e8400-e29b-41d4-a716-446655440001',
        taskId: taskId1,
      });
      const conversation2 = createTestConversation({
        id: '550e8400-e29b-41d4-a716-446655440002',
        taskId: taskId1,
      });
      const conversation3 = createTestConversation({
        id: '550e8400-e29b-41d4-a716-446655440003',
        taskId: taskId2,
      });

      await repository.create(conversation1);
      await repository.create(conversation2);
      await repository.create(conversation3);

      const result = await repository.findByTaskId(taskId1);

      expect(result).toHaveLength(2);
      expect(result.map((c) => c.id)).toContain(conversation1.id);
      expect(result.map((c) => c.id)).toContain(conversation2.id);
      expect(result.map((c) => c.id)).not.toContain(conversation3.id);
    });

    it('should return empty array when task has no conversations', async () => {
      const result = await repository.findByTaskId('nonexistent-task-id');
      expect(result).toEqual([]);
    });
  });

  describe('findAll', () => {
    it('should return empty array when no conversations exist', async () => {
      const result = await repository.findAll();

      expect(result).toEqual([]);
    });

    it('should return all conversations', async () => {
      const conversation1 = createTestConversation({
        id: '550e8400-e29b-41d4-a716-446655440000',
      });
      const conversation2 = createTestConversation({
        id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      });

      await repository.create(conversation1);
      await repository.create(conversation2);

      const result = await repository.findAll();

      expect(result).toHaveLength(2);
      expect(result.find((c) => c.id === conversation1.id)).toMatchObject({
        id: conversation1.id,
        projectId: conversation1.projectId,
      });
      expect(result.find((c) => c.id === conversation2.id)).toMatchObject({
        id: conversation2.id,
        projectId: conversation2.projectId,
      });
    });

    it('should preserve date objects in results', async () => {
      const conversation = createTestConversation();
      await repository.create(conversation);

      const result = await repository.findAll();

      expect(result[0]?.createdAt).toBeInstanceOf(Date);
      expect(result[0]?.updatedAt).toBeInstanceOf(Date);
    });

    it('should preserve datasources array in results', async () => {
      const conversation = createTestConversation({
        datasources: ['ds1', 'ds2'],
      });
      await repository.create(conversation);

      const result = await repository.findAll();

      expect(result[0]?.datasources).toEqual(['ds1', 'ds2']);
      expect(Array.isArray(result[0]?.datasources)).toBe(true);
    });
  });

  describe('update', () => {
    it('should update an existing conversation', async () => {
      const conversation = createTestConversation();
      await repository.create(conversation);

      const updated = {
        ...conversation,
        title: 'Updated Title',
        datasources: ['ds1', 'ds2'],
        updatedAt: new Date('2024-01-02T00:00:00Z'),
        updatedBy: 'updated-user',
      };

      const result = await repository.update(updated);

      expect(result.title).toBe('Updated Title');
      expect(result.datasources).toEqual(['ds1', 'ds2']);
      expect(result.slug).toBe(repository.shortenId(conversation.id));
      expect(result.updatedAt).toEqual(new Date('2024-01-02T00:00:00Z'));
      expect(result.updatedBy).toBe('updated-user');

      const found = await repository.findById(conversation.id);
      expect(found?.title).toBe('Updated Title');
      expect(found?.datasources).toEqual(['ds1', 'ds2']);
    });

    it('should automatically regenerate slug from id on update', async () => {
      const conversation = createTestConversation();
      await repository.create(conversation);

      const updated = {
        ...conversation,
        title: 'Updated Title',
        slug: 'should-be-overridden',
      };

      const result = await repository.update(updated);

      expect(result.slug).toBe(repository.shortenId(conversation.id));
      expect(result.slug).not.toBe('should-be-overridden');
    });

    it('should create a conversation if it does not exist (upsert behavior)', async () => {
      const conversation = createTestConversation({
        id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
      });

      const result = await repository.update(conversation);

      expect(result.id).toBe(conversation.id);
      expect(result.slug).toBe(repository.shortenId(conversation.id));

      const found = await repository.findById(conversation.id);
      expect(found?.id).toBe(conversation.id);
      expect(found?.slug).toBe(repository.shortenId(conversation.id));
    });
  });

  describe('delete', () => {
    it('should delete a conversation by id', async () => {
      const conversation = createTestConversation();
      await repository.create(conversation);

      const result = await repository.delete(conversation.id);

      expect(result).toBe(true);

      const found = await repository.findById(conversation.id);
      expect(found).toBeNull();
    });

    it('should return true even if conversation does not exist', async () => {
      const result = await repository.delete('non-existent-id');

      expect(result).toBe(true);
    });
  });

  describe('integration', () => {
    it('should handle full CRUD lifecycle', async () => {
      const conversation = createTestConversation();

      const created = await repository.create(conversation);
      expect(created.id).toBe(conversation.id);
      expect(created.slug).toBe(repository.shortenId(conversation.id));

      const found = await repository.findById(conversation.id);
      expect(found?.id).toBe(conversation.id);
      expect(found?.slug).toBe(repository.shortenId(conversation.id));

      const updated = {
        ...conversation,
        title: 'Updated',
        updatedAt: new Date('2024-01-03T00:00:00Z'),
      };
      const updatedResult = await repository.update(updated);
      expect(updatedResult.title).toBe('Updated');
      expect(updatedResult.slug).toBe(repository.shortenId(conversation.id));

      const deleted = await repository.delete(conversation.id);
      expect(deleted).toBe(true);

      const foundAfterDelete = await repository.findById(conversation.id);
      expect(foundAfterDelete).toBeNull();
    });

    it('should handle multiple conversations independently', async () => {
      const c1 = createTestConversation({
        id: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Conversation 1',
      });
      const c2 = createTestConversation({
        id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        title: 'Conversation 2',
      });
      const c3 = createTestConversation({
        id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
        title: 'Conversation 3',
      });

      await repository.create(c1);
      await repository.create(c2);
      await repository.create(c3);

      const all = await repository.findAll();
      expect(all).toHaveLength(3);

      await repository.delete(c2.id);

      const remaining = await repository.findAll();
      expect(remaining).toHaveLength(2);
      expect(remaining.find((c) => c.id === c1.id)).toBeDefined();
      expect(remaining.find((c) => c.id === c3.id)).toBeDefined();
      expect(remaining.find((c) => c.id === c2.id)).toBeUndefined();
    });

    it('should preserve all conversation fields correctly', async () => {
      const conversation = createTestConversation({
        projectId: '8d0f678a-8536-51ef-a55c-f18gd2g01bf8',
        taskId: '9d0f678a-8536-51ef-a55c-f18gd2g01bf9',
        title: 'Complex Conversation',
        datasources: ['ds1', 'ds2', 'ds3'],
        createdBy: 'user-1',
        updatedBy: 'user-2',
      });

      await repository.create(conversation);
      const found = await repository.findById(conversation.id);

      expect(found?.projectId).toBe(conversation.projectId);
      expect(found?.taskId).toBe(conversation.taskId);
      expect(found?.title).toBe(conversation.title);
      expect(found?.slug).toBe(repository.shortenId(conversation.id));
      expect(found?.datasources).toEqual(conversation.datasources);
      expect(found?.createdBy).toBe(conversation.createdBy);
      expect(found?.updatedBy).toBe(conversation.updatedBy);
    });

    it('should handle conversations with same projectId', async () => {
      const projectId = '8d0f678a-8536-51ef-a55c-f18gd2g01bf8';
      const c1 = createTestConversation({
        id: '550e8400-e29b-41d4-a716-446655440000',
        projectId,
        title: 'Conversation 1',
      });
      const c2 = createTestConversation({
        id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        projectId,
        title: 'Conversation 2',
      });

      await repository.create(c1);
      await repository.create(c2);

      const byProject = await repository.findByProjectId(projectId);
      expect(byProject).toHaveLength(2);
      expect(byProject.every((c) => c.projectId === projectId)).toBe(true);
      expect(byProject.find((c) => c.id === c1.id)?.slug).toBe(
        repository.shortenId(c1.id),
      );
      expect(byProject.find((c) => c.id === c2.id)?.slug).toBe(
        repository.shortenId(c2.id),
      );
    });

    it('should handle conversations with same taskId', async () => {
      const taskId = '8d0f678a-8536-51ef-a55c-f18gd2g01bf8';
      const c1 = createTestConversation({
        id: '550e8400-e29b-41d4-a716-446655440000',
        taskId,
        title: 'Conversation 1',
      });
      const c2 = createTestConversation({
        id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        taskId,
        title: 'Conversation 2',
      });

      await repository.create(c1);
      await repository.create(c2);

      const byTask = await repository.findByTaskId(taskId);
      expect(byTask).toHaveLength(2);
      expect(byTask.every((c) => c.taskId === taskId)).toBe(true);
      expect(byTask.find((c) => c.id === c1.id)?.slug).toBe(
        repository.shortenId(c1.id),
      );
      expect(byTask.find((c) => c.id === c2.id)?.slug).toBe(
        repository.shortenId(c2.id),
      );
    });
  });

  describe('shortenId', () => {
    it('should shorten an id', () => {
      const shortened = repository.shortenId(
        '550e8400-e29b-41d4-a716-446655440000',
      );
      expect(shortened).toBeDefined();
      expect(typeof shortened).toBe('string');
      expect(shortened.length).toBeLessThan(
        '550e8400-e29b-41d4-a716-446655440000'.length,
      );
    });
  });
});
