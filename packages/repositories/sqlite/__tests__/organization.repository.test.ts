import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import type { Organization } from '@qwery/domain/entities';

import { OrganizationRepository } from '../src/organization.repository';

describe('OrganizationRepository', () => {
  let repository: OrganizationRepository;
  let testDbPath: string;

  beforeEach(() => {
    testDbPath = join(
      tmpdir(),
      `test-organizations-${Date.now()}-${Math.random().toString(36).substring(7)}.db`,
    );
    repository = new OrganizationRepository(testDbPath);
  });

  afterEach(async () => {
    await repository.close();
    try {
      unlinkSync(testDbPath);
    } catch {
      // File might not exist, ignore
    }
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

      expect(result).not.toBeNull();
      expect(result?.id).toBe(organization.id);
      expect(result?.name).toBe(organization.name);
      expect(result?.slug).toBe(repository.shortenId(organization.id));
      expect(result?.createdAt).toBeInstanceOf(Date);
      expect(result?.updatedAt).toBeInstanceOf(Date);
    });

    it('should return null when organization not found', async () => {
      const result = await repository.findById('non-existent-id');
      expect(result).toBeNull();
    });
  });

  describe('findBySlug', () => {
    it('should find an organization by slug', async () => {
      const organization = createTestOrganization();
      await repository.create(organization);

      const result = await repository.findBySlug(organization.slug);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(organization.id);
      expect(result?.name).toBe(organization.name);
      expect(result?.slug).toBe(organization.slug);
    });

    it('should return null when organization not found by slug', async () => {
      const result = await repository.findBySlug('non-existent-slug');
      expect(result).toBeNull();
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
        name: 'Org 1',
      });
      const org2 = createTestOrganization({
        id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        name: 'Org 2',
      });

      await repository.create(org1);
      await repository.create(org2);

      const result = await repository.findAll();

      expect(result).toHaveLength(2);
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
        updatedAt: new Date('2024-01-02T00:00:00Z'),
        updatedBy: 'updated-user',
      };

      const result = await repository.update(updated);

      expect(result.name).toBe('Updated Name');
      expect(result.is_owner).toBe(false);
      expect(result.slug).toBe(repository.shortenId(organization.id));
    });

    it('should throw error when updating non-existent organization', async () => {
      const organization = createTestOrganization({
        id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
      });

      await expect(repository.update(organization)).rejects.toThrow(
        'not found',
      );
    });
  });

  describe('delete', () => {
    it('should delete an organization by id', async () => {
      const organization = createTestOrganization();
      await repository.create(organization);

      const result = await repository.delete(organization.id);

      expect(result).toBe(true);

      const found = await repository.findById(organization.id);
      expect(found).toBeNull();
    });
  });
});
