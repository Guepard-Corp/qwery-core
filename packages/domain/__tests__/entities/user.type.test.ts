import { describe, expect, it } from 'vitest';

import { Exception } from '../../src/common/exception';
import { Roles } from '../../src/common/roles';
import {
  type User,
  UserEntity,
  UserRoleSchema,
  UserSchema,
} from '../../src/entities/user.type';

describe('UserRoleSchema', () => {
  it('should validate valid role', () => {
    const result = UserRoleSchema.safeParse(Roles.USER);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe(Roles.USER);
    }
  });

  it('should validate ADMIN role', () => {
    const result = UserRoleSchema.safeParse(Roles.ADMIN);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe(Roles.ADMIN);
    }
  });

  it('should validate SUPER_ADMIN role', () => {
    const result = UserRoleSchema.safeParse(Roles.SUPER_ADMIN);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe(Roles.SUPER_ADMIN);
    }
  });

  it('should default to USER role when value is missing', () => {
    const result = UserRoleSchema.safeParse(undefined);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe(Roles.USER);
    }
  });

  it('should reject invalid role', () => {
    const result = UserRoleSchema.safeParse('INVALID_ROLE');
    expect(result.success).toBe(false);
  });
});

describe('UserSchema', () => {
  const validUuid = '550e8400-e29b-41d4-a716-446655440000';
  const validDate = new Date('2024-01-01T00:00:00Z');

  it('should validate valid user data', () => {
    const userData: User = {
      id: validUuid,
      username: 'testuser',
      role: Roles.USER,
      createdAt: validDate,
      updatedAt: validDate,
    };

    const result = UserSchema.safeParse(userData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(validUuid);
      expect(result.data.username).toBe('testuser');
      expect(result.data.role).toBe(Roles.USER);
    }
  });

  it('should validate username with dashes', () => {
    const userData: User = {
      id: validUuid,
      username: 'test-user-123',
      role: Roles.USER,
      createdAt: validDate,
      updatedAt: validDate,
    };

    const result = UserSchema.safeParse(userData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.username).toBe('test-user-123');
    }
  });

  it('should reject empty id', () => {
    const userData = {
      id: '',
      username: 'testuser',
      role: Roles.USER,
      createdAt: validDate,
      updatedAt: validDate,
    };

    const result = UserSchema.safeParse(userData);
    expect(result.success).toBe(false);
  });

  it('should reject invalid uuid', () => {
    const userData = {
      id: 'invalid-id',
      username: 'testuser',
      role: Roles.USER,
      createdAt: validDate,
      updatedAt: validDate,
    };

    const result = UserSchema.safeParse(userData);
    expect(result.success).toBe(false);
  });

  it('should reject empty username', () => {
    const userData = {
      id: validUuid,
      username: '',
      role: Roles.USER,
      createdAt: validDate,
      updatedAt: validDate,
    };

    const result = UserSchema.safeParse(userData);
    expect(result.success).toBe(false);
  });

  it('should reject username longer than 32 characters', () => {
    const userData = {
      id: validUuid,
      username: 'a'.repeat(33),
      role: Roles.USER,
      createdAt: validDate,
      updatedAt: validDate,
    };

    const result = UserSchema.safeParse(userData);
    expect(result.success).toBe(false);
  });

  it('should accept username with exactly 32 characters', () => {
    const userData: User = {
      id: validUuid,
      username: 'a'.repeat(32),
      role: Roles.USER,
      createdAt: validDate,
      updatedAt: validDate,
    };

    const result = UserSchema.safeParse(userData);
    expect(result.success).toBe(true);
  });

  it('should reject username with special characters', () => {
    const invalidUsernames = [
      'test_user',
      'test.user',
      'test@user',
      'test user',
      'test+user',
    ];

    for (const username of invalidUsernames) {
      const userData = {
        id: validUuid,
        username,
        role: Roles.USER,
        createdAt: validDate,
        updatedAt: validDate,
      };

      const result = UserSchema.safeParse(userData);
      expect(result.success).toBe(false);
    }
  });

  it('should reject missing required fields', () => {
    const incompleteData = {
      id: validUuid,
      username: 'testuser',
      // missing role, createdAt, updatedAt
    };

    const result = UserSchema.safeParse(incompleteData);
    expect(result.success).toBe(false);
  });

  it('should reject invalid date types', () => {
    const userData = {
      id: validUuid,
      username: 'testuser',
      role: Roles.USER,
      createdAt: '2024-01-01',
      updatedAt: validDate,
    };

    const result = UserSchema.safeParse(userData);
    expect(result.success).toBe(false);
  });
});

describe('UserEntity', () => {
  const validUuid = '550e8400-e29b-41d4-a716-446655440000';
  const validDate = new Date('2024-01-01T00:00:00Z');

  describe('constructor', () => {
    it('should create UserEntity with valid data', () => {
      const userData: User = {
        id: validUuid,
        username: 'testuser',
        role: Roles.USER,
        createdAt: validDate,
        updatedAt: validDate,
      };

      const entity = new UserEntity(userData);

      expect(entity.username).toBe('testuser');
      expect(entity.role).toBe(Roles.USER);
      expect(entity.createdAt).toBe(validDate);
      expect(entity.updatedAt).toBe(validDate);
    });

    it('should create UserEntity with ADMIN role', () => {
      const userData: User = {
        id: validUuid,
        username: 'admin',
        role: Roles.ADMIN,
        createdAt: validDate,
        updatedAt: validDate,
      };

      const entity = new UserEntity(userData);
      expect(entity.role).toBe(Roles.ADMIN);
    });

    it('should create UserEntity with SUPER_ADMIN role', () => {
      const userData: User = {
        id: validUuid,
        username: 'superadmin',
        role: Roles.SUPER_ADMIN,
        createdAt: validDate,
        updatedAt: validDate,
      };

      const entity = new UserEntity(userData);
      expect(entity.role).toBe(Roles.SUPER_ADMIN);
    });
  });

  describe('getId', () => {
    it('should return the user id', () => {
      const userData: User = {
        id: validUuid,
        username: 'testuser',
        role: Roles.USER,
        createdAt: validDate,
        updatedAt: validDate,
      };

      const entity = new UserEntity(userData);
      expect(entity.getId()).toBe(validUuid);
    });

    it('should throw exception when id is undefined', () => {
      const entity = new UserEntity({
        id: undefined as unknown as string,
        username: 'testuser',
        role: Roles.USER,
        createdAt: validDate,
        updatedAt: validDate,
      });

      expect(() => entity.getId()).toThrow(Exception as unknown as Error);
      expect(() => entity.getId()).toThrow('ID is empty');
    });
  });

  describe('getData', () => {
    it('should return complete user data', () => {
      const userData: User = {
        id: validUuid,
        username: 'testuser',
        role: Roles.ADMIN,
        createdAt: validDate,
        updatedAt: validDate,
      };

      const entity = new UserEntity(userData);
      const data = entity['getData']();

      expect(data).toEqual({
        id: validUuid,
        username: 'testuser',
        role: Roles.ADMIN,
        createdAt: validDate,
        updatedAt: validDate,
      });
    });
  });

  describe('validate', () => {
    it('should validate valid user entity', async () => {
      const userData: User = {
        id: validUuid,
        username: 'testuser',
        role: Roles.USER,
        createdAt: validDate,
        updatedAt: validDate,
      };

      const entity = new UserEntity(userData);
      await expect(entity.validate()).resolves.not.toThrow();
    });

    it('should throw validation error for invalid username', async () => {
      const invalidUserData = {
        id: validUuid,
        username: 'test@user', // invalid character
        role: Roles.USER,
        createdAt: validDate,
        updatedAt: validDate,
      };

      const entity = new UserEntity(invalidUserData as User);
      await expect(entity.validate()).rejects.toThrow(
        Exception as unknown as Error,
      );
    });

    it('should throw validation error for invalid id', async () => {
      const invalidUserData = {
        id: 'invalid-id',
        username: 'testuser',
        role: Roles.USER,
        createdAt: validDate,
        updatedAt: validDate,
      };

      const entity = new UserEntity(invalidUserData as User);
      await expect(entity.validate()).rejects.toThrow(
        Exception as unknown as Error,
      );
    });
  });

  describe('static new', () => {
    it('should create new UserEntity with generated id and timestamps', () => {
      const beforeCreation = new Date();
      const entity = UserEntity.new({
        username: 'newuser',
        role: Roles.USER,
      });
      const afterCreation = new Date();

      expect(entity.getId()).toBeDefined();
      expect(entity.getId().length).toBeGreaterThan(0);
      expect(entity.username).toBe('newuser');
      expect(entity.role).toBe(Roles.USER);
      expect(entity.createdAt).toBeInstanceOf(Date);
      expect(entity.updatedAt).toBeInstanceOf(Date);
      expect(entity.createdAt.getTime()).toBeGreaterThanOrEqual(
        beforeCreation.getTime(),
      );
      expect(entity.createdAt.getTime()).toBeLessThanOrEqual(
        afterCreation.getTime(),
      );
      expect(entity.updatedAt.getTime()).toBeGreaterThanOrEqual(
        beforeCreation.getTime(),
      );
      expect(entity.updatedAt.getTime()).toBeLessThanOrEqual(
        afterCreation.getTime(),
      );
    });

    it('should set createdAt and updatedAt to the same value', () => {
      const entity = UserEntity.new({
        username: 'newuser',
        role: Roles.USER,
      });

      expect(entity.createdAt.getTime()).toBe(entity.updatedAt.getTime());
    });

    it('should generate unique ids for multiple entities', () => {
      const entity1 = UserEntity.new({
        username: 'user1',
        role: Roles.USER,
      });
      const entity2 = UserEntity.new({
        username: 'user2',
        role: Roles.USER,
      });

      expect(entity1.getId()).not.toBe(entity2.getId());
    });

    it('should create entity with ADMIN role', () => {
      const entity = UserEntity.new({
        username: 'admin',
        role: Roles.ADMIN,
      });

      expect(entity.role).toBe(Roles.ADMIN);
    });

    it('should create entity with SUPER_ADMIN role', () => {
      const entity = UserEntity.new({
        username: 'superadmin',
        role: Roles.SUPER_ADMIN,
      });

      expect(entity.role).toBe(Roles.SUPER_ADMIN);
    });

    it('should create valid entity that passes validation', async () => {
      const entity = UserEntity.new({
        username: 'validuser',
        role: Roles.USER,
      });

      await expect(entity.validate()).resolves.not.toThrow();
    });
  });
});
