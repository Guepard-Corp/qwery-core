import { beforeEach, describe, expect, it } from 'vitest';

import { Roles } from '@qwery/domain/common';
import type { User } from '@qwery/domain/entities';

import { UserRepository } from '../src/user-repository';

describe('UserRepository', () => {
  let repository: UserRepository;
  const validUuid1 = '550e8400-e29b-41d4-a716-446655440000';
  const validUuid2 = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

  beforeEach(() => {
    repository = new UserRepository();
  });

  describe('create', () => {
    it('should create a user', async () => {
      const user: User = {
        id: validUuid1,
        username: 'testuser',
        role: Roles.USER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await repository.create(user);

      expect(result).toEqual(user);
      expect(result.id).toBe(validUuid1);
      expect(result.username).toBe('testuser');
    });

    it('should create multiple users', async () => {
      const user1: User = {
        id: validUuid1,
        username: 'user1',
        role: Roles.USER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const user2: User = {
        id: validUuid2,
        username: 'user2',
        role: Roles.ADMIN,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await repository.create(user1);
      await repository.create(user2);

      const allUsers = await repository.findAll();
      expect(allUsers).toHaveLength(2);
    });
  });

  describe('findById', () => {
    it('should find user by id', async () => {
      const user: User = {
        id: validUuid1,
        username: 'testuser',
        role: Roles.USER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await repository.create(user);
      const found = await repository.findById(validUuid1);

      expect(found).toEqual(user);
    });

    it('should return null when user not found', async () => {
      const found = await repository.findById('nonexistent-id');
      expect(found).toBeNull();
    });
  });

  describe('findBySlug', () => {
    it('should find user by username (slug)', async () => {
      const user: User = {
        id: validUuid1,
        username: 'testuser',
        role: Roles.USER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await repository.create(user);
      const found = await repository.findBySlug('testuser');

      expect(found).toEqual(user);
      expect(found?.username).toBe('testuser');
    });

    it('should return null when username not found', async () => {
      const found = await repository.findBySlug('nonexistent-user');
      expect(found).toBeNull();
    });

    it('should handle multiple users and find the correct one', async () => {
      const user1: User = {
        id: validUuid1,
        username: 'user1',
        role: Roles.USER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const user2: User = {
        id: validUuid2,
        username: 'user2',
        role: Roles.USER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await repository.create(user1);
      await repository.create(user2);

      const found = await repository.findBySlug('user2');
      expect(found?.id).toBe(validUuid2);
    });
  });

  describe('findAll', () => {
    it('should return empty array when no users exist', async () => {
      const users = await repository.findAll();
      expect(users).toEqual([]);
    });

    it('should return all users', async () => {
      const user1: User = {
        id: validUuid1,
        username: 'user1',
        role: Roles.USER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const user2: User = {
        id: validUuid2,
        username: 'user2',
        role: Roles.ADMIN,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await repository.create(user1);
      await repository.create(user2);

      const users = await repository.findAll();
      expect(users).toHaveLength(2);
      expect(users).toContainEqual(user1);
      expect(users).toContainEqual(user2);
    });

    it('should support pagination with limit', async () => {
      const users: User[] = [];
      for (let i = 0; i < 5; i++) {
        const user: User = {
          id: `01ARZ3NDEKTSV4RRFFQ69G5F${i}`,
          username: `user${i}`,
          role: Roles.USER,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        users.push(user);
        await repository.create(user);
      }

      const limited = await repository.findAll({ limit: 3 });
      expect(limited).toHaveLength(3);
    });

    it('should support pagination with offset', async () => {
      const users: User[] = [];
      for (let i = 0; i < 5; i++) {
        const user: User = {
          id: `01ARZ3NDEKTSV4RRFFQ69G5F${i}`,
          username: `user${i}`,
          role: Roles.USER,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        users.push(user);
        await repository.create(user);
      }

      const offsetted = await repository.findAll({ offset: 2 });
      expect(offsetted).toHaveLength(3);
    });

    it('should support pagination with limit and offset', async () => {
      const users: User[] = [];
      for (let i = 0; i < 10; i++) {
        const user: User = {
          id: `01ARZ3NDEKTSV4RRFFQ69G5F${i}`,
          username: `user${i}`,
          role: Roles.USER,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        users.push(user);
        await repository.create(user);
      }

      const paginated = await repository.findAll({ offset: 2, limit: 3 });
      expect(paginated).toHaveLength(3);
    });
  });

  describe('update', () => {
    it('should update an existing user', async () => {
      const user: User = {
        id: validUuid1,
        username: 'testuser',
        role: Roles.USER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await repository.create(user);

      const updatedUser: User = {
        ...user,
        username: 'updateduser',
        role: Roles.ADMIN,
      };

      const result = await repository.update(updatedUser);

      expect(result.username).toBe('updateduser');
      expect(result.role).toBe(Roles.ADMIN);

      const found = await repository.findById(validUuid1);
      expect(found?.username).toBe('updateduser');
    });

    it('should throw error when updating non-existent user', async () => {
      const user: User = {
        id: validUuid1,
        username: 'testuser',
        role: Roles.USER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await expect(repository.update(user)).rejects.toThrow(
        `User with id ${validUuid1} not found`,
      );
    });
  });

  describe('delete', () => {
    it('should delete an existing user', async () => {
      const user: User = {
        id: validUuid1,
        username: 'testuser',
        role: Roles.USER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await repository.create(user);
      const result = await repository.delete(validUuid1);

      expect(result).toBe(true);

      const found = await repository.findById(validUuid1);
      expect(found).toBeNull();
    });

    it('should return false when deleting non-existent user', async () => {
      const result = await repository.delete('nonexistent-id');
      expect(result).toBe(false);
    });

    it('should only delete the specified user', async () => {
      const user1: User = {
        id: validUuid1,
        username: 'user1',
        role: Roles.USER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const user2: User = {
        id: validUuid2,
        username: 'user2',
        role: Roles.USER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await repository.create(user1);
      await repository.create(user2);

      await repository.delete(validUuid1);

      const found1 = await repository.findById(validUuid1);
      const found2 = await repository.findById(validUuid2);

      expect(found1).toBeNull();
      expect(found2).toEqual(user2);
    });
  });

  describe('shortenId', () => {
    it('should shorten an id', () => {
      const shortened = repository.shortenId(validUuid1);
      expect(shortened).toBeDefined();
      expect(typeof shortened).toBe('string');
      expect(shortened.length).toBeLessThan(validUuid1.length);
    });
  });
});
