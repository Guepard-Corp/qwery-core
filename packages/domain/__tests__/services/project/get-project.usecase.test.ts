import { describe, expect, it } from 'vitest';
import { DomainException } from '../../../src/exceptions';
import type { Project } from '../../../src/entities/project.type';
import { IProjectRepository } from '../../../src/repositories/project-repository.port';
import {
  GetProjectService,
  GetProjectBySlugService,
} from '../../../src/services/project/get-project.usecase';

class MockProjectRepository implements IProjectRepository {
  private projects = new Map<string, Project>();

  async findAll() {
    return Array.from(this.projects.values());
  }

  async findById(id: string) {
    return this.projects.get(id) ?? null;
  }

  async findBySlug(slug: string) {
    const projects = Array.from(this.projects.values());
    return projects.find((p) => p.slug === slug) ?? null;
  }

  async create(entity: Project) {
    this.projects.set(entity.id, entity);
    return entity;
  }

  async update(entity: Project) {
    if (!this.projects.has(entity.id)) {
      throw new Error(`Project with id ${entity.id} not found`);
    }
    this.projects.set(entity.id, entity);
    return entity;
  }

  async delete(id: string) {
    return this.projects.delete(id);
  }

  shortenId(id: string) {
    return id.slice(0, 8);
  }
}

describe('GetProjectService', () => {
  it('should return project when found', async () => {
    const repository = new MockProjectRepository();
    const service = new GetProjectService(repository);

    const project: Project = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      org_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      name: 'Test Project',
      slug: 'test-project',
      description: 'Test description',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user-id',
      updatedBy: 'user-id',
    };

    await repository.create(project);

    const result = await service.execute(project.id);

    expect(result).toBeDefined();
    expect(result.id).toBe(project.id);
    expect(result.name).toBe(project.name);
  });

  it('should throw DomainException when project not found', async () => {
    const repository = new MockProjectRepository();
    const service = new GetProjectService(repository);

    await expect(service.execute('nonexistent-id')).rejects.toThrow(
      DomainException,
    );
    await expect(service.execute('nonexistent-id')).rejects.toThrow(
      "Project with id 'nonexistent-id' not found",
    );
  });
});

describe('GetProjectBySlugService', () => {
  it('should return project when found by slug', async () => {
    const repository = new MockProjectRepository();
    const service = new GetProjectBySlugService(repository);

    const project: Project = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      org_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      name: 'Test Project',
      slug: 'test-project',
      description: 'Test description',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user-id',
      updatedBy: 'user-id',
    };

    await repository.create(project);

    const result = await service.execute(project.slug);

    expect(result).toBeDefined();
    expect(result.id).toBe(project.id);
    expect(result.name).toBe(project.name);
    expect(result.slug).toBe(project.slug);
    expect(result.description).toBe(project.description);
    expect(result.status).toBe(project.status);
    expect(result.org_id).toBe(project.org_id);
  });

  it('should throw DomainException when project not found by slug', async () => {
    const repository = new MockProjectRepository();
    const service = new GetProjectBySlugService(repository);

    await expect(service.execute('nonexistent-slug')).rejects.toThrow(
      DomainException,
    );
    await expect(service.execute('nonexistent-slug')).rejects.toThrow(
      "Project with slug 'nonexistent-slug' not found",
    );
  });

  it('should return project with all properties when found by slug', async () => {
    const repository = new MockProjectRepository();
    const service = new GetProjectBySlugService(repository);

    const project: Project = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      org_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      name: 'Test Project',
      slug: 'test-project',
      description: 'Test description',
      status: 'active',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
      createdBy: 'user1',
      updatedBy: 'user2',
    };

    await repository.create(project);

    const result = await service.execute(project.slug);

    expect(result.id).toBe(project.id);
    expect(result.name).toBe(project.name);
    expect(result.slug).toBe(project.slug);
    expect(result.description).toBe(project.description);
    expect(result.status).toBe(project.status);
    expect(result.org_id).toBe(project.org_id);
    expect(result.createdAt).toEqual(project.createdAt);
    expect(result.updatedAt).toEqual(project.updatedAt);
    expect(result.createdBy).toBe(project.createdBy);
    expect(result.updatedBy).toBe(project.updatedBy);
  });

  it('should find correct project by slug when multiple projects exist', async () => {
    const repository = new MockProjectRepository();
    const service = new GetProjectBySlugService(repository);

    const project1: Project = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      org_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      name: 'First Project',
      slug: 'first-project',
      description: 'First description',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user-id',
      updatedBy: 'user-id',
    };

    const project2: Project = {
      id: '550e8400-e29b-41d4-a716-446655440001',
      org_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      name: 'Second Project',
      slug: 'second-project',
      description: 'Second description',
      status: 'inactive',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user-id',
      updatedBy: 'user-id',
    };

    await repository.create(project1);
    await repository.create(project2);

    const result = await service.execute('second-project');

    expect(result.id).toBe(project2.id);
    expect(result.name).toBe(project2.name);
    expect(result.slug).toBe(project2.slug);
    expect(result.status).toBe(project2.status);
  });
});
