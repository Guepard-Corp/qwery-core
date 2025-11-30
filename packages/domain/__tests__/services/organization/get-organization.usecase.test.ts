import { describe, expect, it } from 'vitest';
import { DomainException } from '../../../src/exceptions';
import type { Organization } from '../../../src/entities/organization.type';
import { IOrganizationRepository } from '../../../src/repositories/organization-repository.port';
import {
  GetOrganizationService,
  GetOrganizationBySlugService,
} from '../../../src/services/organization/get-organization.usecase';

class MockOrganizationRepository implements IOrganizationRepository {
  private organizations = new Map<string, Organization>();

  async findAll() {
    return Array.from(this.organizations.values());
  }

  async findById(id: string) {
    return this.organizations.get(id) ?? null;
  }

  async findBySlug(slug: string) {
    const orgs = Array.from(this.organizations.values());
    return orgs.find((org) => org.slug === slug) ?? null;
  }

  async create(entity: Organization) {
    this.organizations.set(entity.id, entity);
    return entity;
  }

  async update(entity: Organization) {
    if (!this.organizations.has(entity.id)) {
      throw new Error(`Organization with id ${entity.id} not found`);
    }
    this.organizations.set(entity.id, entity);
    return entity;
  }

  async delete(id: string) {
    return this.organizations.delete(id);
  }

  shortenId(id: string) {
    return id.slice(0, 8);
  }
}

describe('GetOrganizationService', () => {
  it('should return organization when found', async () => {
    const repository = new MockOrganizationRepository();
    const service = new GetOrganizationService(repository);

    const organization: Organization = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Test Organization',
      slug: 'test-organization',
      is_owner: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user-id',
      updatedBy: 'user-id',
    };

    await repository.create(organization);

    const result = await service.execute(organization.id);

    expect(result).toBeDefined();
    expect(result.id).toBe(organization.id);
    expect(result.name).toBe(organization.name);
    expect(result.slug).toBe(organization.slug);
    expect(result.is_owner).toBe(organization.is_owner);
  });

  it('should throw DomainException when organization not found', async () => {
    const repository = new MockOrganizationRepository();
    const service = new GetOrganizationService(repository);

    await expect(service.execute('nonexistent-id')).rejects.toThrow(
      DomainException,
    );
    await expect(service.execute('nonexistent-id')).rejects.toThrow(
      "Organization with id 'nonexistent-id' not found",
    );
  });

  it('should return organization with all properties', async () => {
    const repository = new MockOrganizationRepository();
    const service = new GetOrganizationService(repository);

    const organization: Organization = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Test Organization',
      slug: 'test-organization',
      is_owner: false,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
      createdBy: 'user1',
      updatedBy: 'user2',
    };

    await repository.create(organization);

    const result = await service.execute(organization.id);

    expect(result.id).toBe(organization.id);
    expect(result.name).toBe(organization.name);
    expect(result.slug).toBe(organization.slug);
    expect(result.is_owner).toBe(organization.is_owner);
    expect(result.createdAt).toEqual(organization.createdAt);
    expect(result.updatedAt).toEqual(organization.updatedAt);
    expect(result.createdBy).toBe(organization.createdBy);
    expect(result.updatedBy).toBe(organization.updatedBy);
  });
});

describe('GetOrganizationBySlugService', () => {
  it('should return organization when found by slug', async () => {
    const repository = new MockOrganizationRepository();
    const service = new GetOrganizationBySlugService(repository);

    const organization: Organization = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Test Organization',
      slug: 'test-organization',
      is_owner: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user-id',
      updatedBy: 'user-id',
    };

    await repository.create(organization);

    const result = await service.execute(organization.slug);

    expect(result).toBeDefined();
    expect(result.id).toBe(organization.id);
    expect(result.name).toBe(organization.name);
    expect(result.slug).toBe(organization.slug);
    expect(result.is_owner).toBe(organization.is_owner);
  });

  it('should throw DomainException when organization not found by slug', async () => {
    const repository = new MockOrganizationRepository();
    const service = new GetOrganizationBySlugService(repository);

    await expect(service.execute('nonexistent-slug')).rejects.toThrow(
      DomainException,
    );
    await expect(service.execute('nonexistent-slug')).rejects.toThrow(
      "Organization with id 'nonexistent-slug' not found",
    );
  });

  it('should return organization with all properties when found by slug', async () => {
    const repository = new MockOrganizationRepository();
    const service = new GetOrganizationBySlugService(repository);

    const organization: Organization = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Test Organization',
      slug: 'test-organization',
      is_owner: false,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
      createdBy: 'user1',
      updatedBy: 'user2',
    };

    await repository.create(organization);

    const result = await service.execute(organization.slug);

    expect(result.id).toBe(organization.id);
    expect(result.name).toBe(organization.name);
    expect(result.slug).toBe(organization.slug);
    expect(result.is_owner).toBe(organization.is_owner);
    expect(result.createdAt).toEqual(organization.createdAt);
    expect(result.updatedAt).toEqual(organization.updatedAt);
    expect(result.createdBy).toBe(organization.createdBy);
    expect(result.updatedBy).toBe(organization.updatedBy);
  });

  it('should find correct organization by slug when multiple organizations exist', async () => {
    const repository = new MockOrganizationRepository();
    const service = new GetOrganizationBySlugService(repository);

    const organization1: Organization = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'First Organization',
      slug: 'first-organization',
      is_owner: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user-id',
      updatedBy: 'user-id',
    };

    const organization2: Organization = {
      id: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Second Organization',
      slug: 'second-organization',
      is_owner: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user-id',
      updatedBy: 'user-id',
    };

    await repository.create(organization1);
    await repository.create(organization2);

    const result = await service.execute('second-organization');

    expect(result.id).toBe(organization2.id);
    expect(result.name).toBe(organization2.name);
    expect(result.slug).toBe(organization2.slug);
    expect(result.is_owner).toBe(organization2.is_owner);
  });
});
