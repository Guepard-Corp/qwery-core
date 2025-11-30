import { describe, expect, it } from 'vitest';
import type { Project } from '../../../src/entities/project.type';
import { IProjectRepository } from '../../../src/repositories/project-repository.port';
import { CreateProjectService } from '../../../src/services/project/create-project.usecase';

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

describe('CreateProjectService', () => {
  it('should create a new project', async () => {
    const repository = new MockProjectRepository();
    const service = new CreateProjectService(repository);

    const result = await service.execute({
      org_id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Test Project',
      description: 'Test description',
      status: 'active',
      createdBy: 'user-id',
    });

    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
    expect(result.name).toBe('Test Project');
    expect(result.description).toBe('Test description');
    expect(result.status).toBe('active');
    expect(result.org_id).toBe('550e8400-e29b-41d4-a716-446655440000');
    expect(result.slug).toBeDefined();
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.updatedAt).toBeInstanceOf(Date);
  });

  it('should generate unique ids for different projects', async () => {
    const repository = new MockProjectRepository();
    const service = new CreateProjectService(repository);

    const result1 = await service.execute({
      org_id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Project 1',
      description: 'Description 1',
      status: 'active',
      createdBy: 'user-id',
    });

    const result2 = await service.execute({
      org_id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Project 2',
      description: 'Description 2',
      status: 'active',
      createdBy: 'user-id',
    });

    expect(result1.id).not.toBe(result2.id);
    expect(result1.slug).not.toBe(result2.slug);
  });
});
