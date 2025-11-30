import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import type { User } from '@qwery/domain/entities';
import { Roles } from '@qwery/domain/common';

import { UserRepository } from '../src/user.repository';

describe('UserRepository', () => {
  let repository: UserRepository;
  let testDbPath: string;

  beforeEach(() => {
    testDbPath = join(
      tmpdir(),
      `test-users-${Date.now()}-${Math.random().toString(36).substring(7)}.db`,
    );
    repository = new UserRepository(testDbPath);
  });

  afterEach(async () => {
    await repository.close();
    try {
      unlinkSync(testDbPath);
    } catch {
      // File might not exist, ignore
    }
  });

  const createTestUser = (overrides?: Partial<User>): User => {
    const id = overrides?.id || '550e8400-e29b-41d4-a716-446655440000';
    return {
      id,
      username: 'testuser',
      role: Roles.USER,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
      ...overrides,
    };
  };

  describe('create', () => {
    it('should create a new user', async () => {
      const user = createTestUser();
      const result = await repository.create(user);

      expect(result.id).toBe(user.id);
      expect(result.username).toBe(user.username);
      expect(result.role).toBe(user.role);
    });

    it('should throw error when creating duplicate user', async () => {
      const user = createTestUser();
      await repository.create(user);

      await expect(repository.create(user)).rejects.toThrow('already exists');
    });
  });

  describe('findById', () => {
    it('should find a user by id', async () => {
      const user = createTestUser();
      await repository.create(user);

      const result = await repository.findById(user.id);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(user.id);
      expect(result?.username).toBe(user.username);
      expect(result?.role).toBe(user.role);
    });

    it('should return null when user not found', async () => {
      const result = await repository.findById('non-existent-id');
      expect(result).toBeNull();
    });
  });

  describe('findBySlug', () => {
    it('should find a user by slug (username)', async () => {
      const user = createTestUser();
      await repository.create(user);

      const result = await repository.findBySlug(user.username);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(user.id);
      expect(result?.username).toBe(user.username);
    });

    it('should return null when user not found by slug', async () => {
      const result = await repository.findBySlug('non-existent-username');
      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return empty array when no users exist', async () => {
      const result = await repository.findAll();

      expect(result).toEqual([]);
    });

    it('should return all users', async () => {
      const user1 = createTestUser({
        id: '550e8400-e29b-41d4-a716-446655440000',
        username: 'user1',
      });
      const user2 = createTestUser({
        id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        username: 'user2',
      });

      await repository.create(user1);
      await repository.create(user2);

      const result = await repository.findAll();

      expect(result).toHaveLength(2);
    });
  });

  describe('update', () => {
    it('should update an existing user', async () => {
      const user = createTestUser();
      await repository.create(user);

      const updated = {
        ...user,
        username: 'updateduser',
        role: Roles.ADMIN,
        updatedAt: new Date('2024-01-02T00:00:00Z'),
      };

      const result = await repository.update(updated);

      expect(result.username).toBe('updateduser');
      expect(result.role).toBe(Roles.ADMIN);
    });

    it('should throw error when updating non-existent user', async () => {
      const user = createTestUser({
        id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
      });

      await expect(repository.update(user)).rejects.toThrow('not found');
    });
  });

  describe('delete', () => {
    it('should delete a user by id', async () => {
      const user = createTestUser();
      await repository.create(user);

      const result = await repository.delete(user.id);

      expect(result).toBe(true);

      const found = await repository.findById(user.id);
      expect(found).toBeNull();
    });
  });

  describe('integration', () => {
    it('should handle full CRUD lifecycle', async () => {
      const user = createTestUser();

      const created = await repository.create(user);
      expect(created.id).toBe(user.id);

      const found = await repository.findById(user.id);
      expect(found?.id).toBe(user.id);

      const updated = {
        ...user,
        username: 'updated',
        updatedAt: new Date('2024-01-03T00:00:00Z'),
      };
      const updatedResult = await repository.update(updated);
      expect(updatedResult.username).toBe('updated');

      const deleted = await repository.delete(user.id);
      expect(deleted).toBe(true);

      const foundAfterDelete = await repository.findById(user.id);
      expect(foundAfterDelete).toBeNull();
    });
  });
});
