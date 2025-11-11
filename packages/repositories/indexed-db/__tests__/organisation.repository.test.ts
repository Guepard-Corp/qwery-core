import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { Organization } from '@qwery/domain/entities';

import { OrganizationRepository } from '../src/organization.respository';

describe('OrganizationRepository', () => {
  let repository: OrganizationRepository;
  const testDbName = 'test-organizations';

  beforeEach(async () => {
    repository = new OrganizationRepository(testDbName);
    await repository.close();
    await new Promise<void>((resolve, reject) => {
      const deleteRequest = indexedDB.deleteDatabase(testDbName);
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
    });
    repository = new OrganizationRepository(testDbName);
  });

  afterEach(async () => {
    await repository.close();
    await new Promise<void>((resolve, reject) => {
      const deleteRequest = indexedDB.deleteDatabase(testDbName);
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
    });
  });

  const createTestOrganization = (
    overrides?: Partial<Organization>,
  ): Organization => {
    const id = overrides?.id || '550e8400-e29b-41d4-a716-446655440000';
    return {
      id,
      name: 'Test Organization',
      slug: repository.shortenId(id),
      is_owner: true,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
      createdBy: 'test-user',
      updatedBy: 'test-user',
      ...overrides,
    };
  };

  describe('create', () => {
    it('should create a new organization', async () => {
      const organization = createTestOrganization();
      const result = await repository.create(organization);

      expect(result.id).toBe(organization.id);
      expect(result.name).toBe(organization.name);
      expect(result.slug).toBe(repository.shortenId(organization.id));
      expect(result.slug.length).toBeGreaterThanOrEqual(8);
    });

    it('should automatically generate slug from id', async () => {
      const organization = createTestOrganization({
        slug: 'should-be-overridden',
      });
      const result = await repository.create(organization);

      expect(result.slug).toBe(repository.shortenId(organization.id));
      expect(result.slug).not.toBe('should-be-overridden');
    });

    it('should throw error when creating duplicate organization', async () => {
      const organization = createTestOrganization();
      await repository.create(organization);

      await expect(repository.create(organization)).rejects.toThrow(
        'already exists',
      );
    });
  });

  describe('findById', () => {
    it('should find an organization by id', async () => {
      const organization = createTestOrganization();
      await repository.create(organization);

      const result = await repository.findById(organization.id);

      expect(result.id).toBe(organization.id);
      expect(result.name).toBe(organization.name);
      expect(result.slug).toBe(repository.shortenId(organization.id));
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should throw error when organization not found', async () => {
      await expect(repository.findById('non-existent-id')).rejects.toThrow(
        'not found',
      );
    });
  });

  describe('findAll', () => {
    it('should return empty array when no organizations exist', async () => {
      const result = await repository.findAll();

      expect(result).toEqual([]);
    });

    it('should return all organizations', async () => {
      const org1 = createTestOrganization({
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Organization 1',
      });
      const org2 = createTestOrganization({
        id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        name: 'Organization 2',
      });

      await repository.create(org1);
      await repository.create(org2);

      const result = await repository.findAll();

      expect(result).toHaveLength(2);
      expect(result.find((o) => o.id === org1.id)).toMatchObject({
        id: org1.id,
        name: org1.name,
        slug: repository.shortenId(org1.id),
      });
      expect(result.find((o) => o.id === org2.id)).toMatchObject({
        id: org2.id,
        name: org2.name,
        slug: repository.shortenId(org2.id),
      });
    });

    it('should preserve date objects in results', async () => {
      const organization = createTestOrganization();
      await repository.create(organization);

      const result = await repository.findAll();

      expect(result[0]?.createdAt).toBeInstanceOf(Date);
      expect(result[0]?.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('update', () => {
    it('should update an existing organization', async () => {
      const organization = createTestOrganization();
      await repository.create(organization);

      const updated = {
        ...organization,
        name: 'Updated Name',
        is_owner: false,
        billing_email: 'new@test.com',
        updatedAt: new Date('2024-01-02T00:00:00Z'),
        updatedBy: 'updated-user',
      };

      const result = await repository.update(updated);

      expect(result.name).toBe('Updated Name');
      expect(result.slug).toBe(repository.shortenId(organization.id));
      expect(result.is_owner).toBe(false);
      expect(result.updatedAt).toEqual(new Date('2024-01-02T00:00:00Z'));
      expect(result.updatedBy).toBe('updated-user');
    });

    it('should automatically regenerate slug from id on update', async () => {
      const organization = createTestOrganization();
      await repository.create(organization);

      const updated = {
        ...organization,
        name: 'Updated Name',
        slug: 'should-be-overridden',
      };

      const result = await repository.update(updated);

      expect(result.slug).toBe(repository.shortenId(organization.id));
      expect(result.slug).not.toBe('should-be-overridden');
    });

    it('should create an organization if it does not exist (upsert behavior)', async () => {
      const organization = createTestOrganization({
        id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
      });

      const result = await repository.update(organization);

      expect(result.id).toBe(organization.id);
      expect(result.slug).toBe(repository.shortenId(organization.id));

      const found = await repository.findById(organization.id);
      expect(found.id).toBe(organization.id);
      expect(found.slug).toBe(repository.shortenId(organization.id));
    });

    describe('delete', () => {
      it('should delete an organization by id', async () => {
        const organization = createTestOrganization();
        await repository.create(organization);

        const result = await repository.delete(organization.id);

        expect(result).toBe(true);

        await expect(repository.findById(organization.id)).rejects.toThrow(
          'not found',
        );
      });

      it('should return true even if organization does not exist', async () => {
        const result = await repository.delete('non-existent-id');

        expect(result).toBe(true);
      });
    });

    describe('integration', () => {
      it('should handle full CRUD lifecycle', async () => {
        const organization = createTestOrganization();

        const created = await repository.create(organization);
        expect(created.id).toBe(organization.id);
        expect(created.slug).toBe(repository.shortenId(organization.id));

        const found = await repository.findById(organization.id);
        expect(found.id).toBe(organization.id);
        expect(found.slug).toBe(repository.shortenId(organization.id));

        const updated = {
          ...organization,
          name: 'Updated',
          updatedAt: new Date('2024-01-03T00:00:00Z'),
        };
        const updatedResult = await repository.update(updated);
        expect(updatedResult.name).toBe('Updated');
        expect(updatedResult.slug).toBe(repository.shortenId(organization.id));

        const deleted = await repository.delete(organization.id);
        expect(deleted).toBe(true);

        await expect(repository.findById(organization.id)).rejects.toThrow(
          'not found',
        );
      });

      it('should handle multiple organizations independently', async () => {
        const o1 = createTestOrganization({
          id: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Org 1',
        });
        const o2 = createTestOrganization({
          id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
          name: 'Org 2',
        });
        const o3 = createTestOrganization({
          id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
          name: 'Org 3',
        });

        await repository.create(o1);
        await repository.create(o2);
        await repository.create(o3);

        const all = await repository.findAll();
        expect(all).toHaveLength(3);

        await repository.delete(o2.id);

        const remaining = await repository.findAll();
        expect(remaining).toHaveLength(2);
        expect(remaining.find((o) => o.id === o1.id)).toBeDefined();
        expect(remaining.find((o) => o.id === o3.id)).toBeDefined();
        expect(remaining.find((o) => o.id === o2.id)).toBeUndefined();
      });

      it('should preserve all organization fields correctly', async () => {
        const organization = createTestOrganization({
          name: 'Complex Organization',
          is_owner: false,
        });

        await repository.create(organization);
        const found = await repository.findById(organization.id);

        expect(found.name).toBe(organization.name);
        expect(found.slug).toBe(repository.shortenId(organization.id));
        expect(found.is_owner).toBe(organization.is_owner);

        expect(found.createdBy).toBe(organization.createdBy);
        expect(found.updatedBy).toBe(organization.updatedBy);
      });

      it('should handle is_owner boolean field correctly', async () => {
        const org1 = createTestOrganization({
          id: '9e1f789b-9647-62fg-b66d-g29he3h12cg9',
          is_owner: true,
        });
        const org2 = createTestOrganization({
          id: 'af2g890c-a758-73gh-c77e-h3aif4i23dh0',
          is_owner: false,
        });

        await repository.create(org1);
        await repository.create(org2);

        const found1 = await repository.findById(org1.id);
        const found2 = await repository.findById(org2.id);

        expect(found1.is_owner).toBe(true);
        expect(found2.is_owner).toBe(false);
      });
    });
  });
});
