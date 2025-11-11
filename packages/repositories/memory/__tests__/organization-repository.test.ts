import { beforeEach, describe, expect, it } from 'vitest';

import type { Organization } from '@qwery/domain/entities';

import { OrganizationRepository } from '../src/organization-repository';

describe('OrganizationRepository', () => {
  let repository: OrganizationRepository;
  const validUuid1 = '550e8400-e29b-41d4-a716-446655440000';
  const validUuid2 = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

  beforeEach(() => {
    repository = new OrganizationRepository();
  });

  describe('create', () => {
    it('should create an organization', async () => {
      const org: Organization = {
        id: validUuid1,
        name: 'Test Org',
        slug: 'test-org',
        is_owner: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user1',
        updatedBy: 'user1',
      };

      const result = await repository.create(org);

      expect(result).toEqual(org);
      expect(result.name).toBe('Test Org');
      expect(result.slug).toBe('test-org');
    });
  });

  describe('findById', () => {
    it('should find organization by id', async () => {
      const org: Organization = {
        id: validUuid1,
        name: 'Test Org',
        slug: 'test-org',
        is_owner: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user1',
        updatedBy: 'user1',
      };

      await repository.create(org);
      const found = await repository.findById(validUuid1);

      expect(found).toEqual(org);
    });

    it('should return null when organization not found', async () => {
      const found = await repository.findById('nonexistent-id');
      expect(found).toBeNull();
    });
  });

  describe('findBySlug', () => {
    it('should find organization by slug', async () => {
      const org: Organization = {
        id: validUuid1,
        name: 'Test Org',
        slug: 'test-org',
        is_owner: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user1',
        updatedBy: 'user1',
      };

      await repository.create(org);
      const found = await repository.findBySlug('test-org');

      expect(found).toEqual(org);
      expect(found?.slug).toBe('test-org');
    });

    it('should return null when slug not found', async () => {
      const found = await repository.findBySlug('nonexistent-slug');
      expect(found).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return empty array when no organizations exist', async () => {
      const orgs = await repository.findAll();
      expect(orgs).toEqual([]);
    });

    it('should return all organizations', async () => {
      const org1: Organization = {
        id: validUuid1,
        name: 'Org 1',
        slug: 'org-1',
        is_owner: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user1',
        updatedBy: 'user1',
      };

      const org2: Organization = {
        id: validUuid2,
        name: 'Org 2',
        slug: 'org-2',
        is_owner: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user2',
        updatedBy: 'user2',
      };

      await repository.create(org1);
      await repository.create(org2);

      const orgs = await repository.findAll();
      expect(orgs).toHaveLength(2);
      expect(orgs).toContainEqual(org1);
      expect(orgs).toContainEqual(org2);
    });

    it('should support pagination with limit', async () => {
      for (let i = 0; i < 5; i++) {
        const org: Organization = {
          id: `01ARZ3NDEKTSV4RRFFQ69G5F${i}`,
          name: `Org ${i}`,
          slug: `org-${i}`,
          is_owner: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'user1',
          updatedBy: 'user1',
        };
        await repository.create(org);
      }

      const limited = await repository.findAll({ limit: 3 });
      expect(limited).toHaveLength(3);
    });

    it('should support pagination with offset and limit', async () => {
      for (let i = 0; i < 10; i++) {
        const org: Organization = {
          id: `01ARZ3NDEKTSV4RRFFQ69G5F${i}`,
          name: `Org ${i}`,
          slug: `org-${i}`,
          is_owner: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'user1',
          updatedBy: 'user1',
        };
        await repository.create(org);
      }

      const paginated = await repository.findAll({ offset: 2, limit: 3 });
      expect(paginated).toHaveLength(3);
    });
  });

  describe('update', () => {
    it('should update an existing organization', async () => {
      const org: Organization = {
        id: validUuid1,
        name: 'Test Org',
        slug: 'test-org',
        is_owner: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user1',
        updatedBy: 'user1',
      };

      await repository.create(org);

      const updatedOrg: Organization = {
        ...org,
        name: 'Updated Org',
        updatedBy: 'user2',
      };

      const result = await repository.update(updatedOrg);

      expect(result.name).toBe('Updated Org');
      expect(result.updatedBy).toBe('user2');

      const found = await repository.findById(validUuid1);
      expect(found?.name).toBe('Updated Org');
    });

    it('should throw error when updating non-existent organization', async () => {
      const org: Organization = {
        id: validUuid1,
        name: 'Test Org',
        slug: 'test-org',
        is_owner: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user1',
        updatedBy: 'user1',
      };

      await expect(repository.update(org)).rejects.toThrow(
        `Organization with id ${validUuid1} not found`,
      );
    });
  });

  describe('delete', () => {
    it('should delete an existing organization', async () => {
      const org: Organization = {
        id: validUuid1,
        name: 'Test Org',
        slug: 'test-org',
        is_owner: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user1',
        updatedBy: 'user1',
      };

      await repository.create(org);
      const result = await repository.delete(validUuid1);

      expect(result).toBe(true);

      const found = await repository.findById(validUuid1);
      expect(found).toBeNull();
    });

    it('should return false when deleting non-existent organization', async () => {
      const result = await repository.delete('nonexistent-id');
      expect(result).toBe(false);
    });
  });
});
