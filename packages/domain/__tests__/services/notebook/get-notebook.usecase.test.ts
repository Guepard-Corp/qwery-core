import { describe, expect, it } from 'vitest';
import { DomainException } from '../../../src/exceptions';
import type { Notebook } from '../../../src/entities/notebook.type';
import { INotebookRepository } from '../../../src/repositories/notebook-repository.port';
import {
  GetNotebookService,
  GetNotebookBySlugService,
} from '../../../src/services/notebook/get-notebook.usecase';

class MockNotebookRepository implements INotebookRepository {
  private notebooks = new Map<string, Notebook>();

  async findAll() {
    return Array.from(this.notebooks.values());
  }

  async findById(id: string) {
    return this.notebooks.get(id) ?? null;
  }

  async findBySlug(slug: string) {
    const notebooks = Array.from(this.notebooks.values());
    return notebooks.find((n) => n.slug === slug) ?? null;
  }

  async findByProjectId(projectId: string) {
    const notebooks = Array.from(this.notebooks.values());
    const filtered = notebooks.filter((n) => n.projectId === projectId);
    return filtered.length > 0 ? filtered : null;
  }

  async create(entity: Notebook) {
    this.notebooks.set(entity.id, entity);
    return entity;
  }

  async update(entity: Notebook) {
    if (!this.notebooks.has(entity.id)) {
      throw new Error(`Notebook with id ${entity.id} not found`);
    }
    this.notebooks.set(entity.id, entity);
    return entity;
  }

  async delete(id: string) {
    return this.notebooks.delete(id);
  }

  shortenId(id: string) {
    return id.slice(0, 8);
  }
}

describe('GetNotebookService', () => {
  it('should return notebook when found', async () => {
    const repository = new MockNotebookRepository();
    const service = new GetNotebookService(repository);

    const notebook: Notebook = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      projectId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      title: 'Test Notebook',
      description: 'Test description',
      slug: 'test-notebook',
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      datasources: [],
      cells: [],
    };

    await repository.create(notebook);

    const result = await service.execute(notebook.id);

    expect(result).toBeDefined();
    expect(result.id).toBe(notebook.id);
    expect(result.title).toBe(notebook.title);
    expect(result.description).toBe(notebook.description);
    expect(result.projectId).toBe(notebook.projectId);
  });

  it('should throw DomainException when notebook not found', async () => {
    const repository = new MockNotebookRepository();
    const service = new GetNotebookService(repository);

    await expect(service.execute('nonexistent-id')).rejects.toThrow(
      DomainException,
    );
    await expect(service.execute('nonexistent-id')).rejects.toThrow(
      "Notebook with id 'nonexistent-id' not found",
    );
  });

  it('should return notebook with all properties', async () => {
    const repository = new MockNotebookRepository();
    const service = new GetNotebookService(repository);

    const notebook: Notebook = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      projectId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      title: 'Test Notebook',
      description: 'Test description',
      slug: 'test-notebook',
      version: 2,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
      datasources: ['ds1', 'ds2'],
      cells: [],
    };

    await repository.create(notebook);

    const result = await service.execute(notebook.id);

    expect(result.id).toBe(notebook.id);
    expect(result.title).toBe(notebook.title);
    expect(result.description).toBe(notebook.description);
    expect(result.slug).toBe(notebook.slug);
    expect(result.version).toBe(notebook.version);
    expect(result.datasources).toEqual(notebook.datasources);
    expect(result.cells).toEqual(notebook.cells);
  });

  it('should handle notebook with cells and datasources', async () => {
    const repository = new MockNotebookRepository();
    const service = new GetNotebookService(repository);

    const notebook: Notebook = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      projectId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      title: 'Test Notebook',
      description: 'Test description',
      slug: 'test-notebook',
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      datasources: ['ds1', 'ds2'],
      cells: [
        {
          query: 'SELECT 1',
          cellType: 'query',
          cellId: 1,
          datasources: ['ds1'],
          isActive: true,
          runMode: 'default',
        },
      ],
    };

    await repository.create(notebook);

    const result = await service.execute(notebook.id);

    expect(result.datasources).toEqual(['ds1', 'ds2']);
    expect(result.cells).toHaveLength(1);
    expect(result.cells[0].query).toBe('SELECT 1');
  });
});

describe('GetNotebookBySlugService', () => {
  it('should return notebook when found by slug', async () => {
    const repository = new MockNotebookRepository();
    const service = new GetNotebookBySlugService(repository);

    const notebook: Notebook = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      projectId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      title: 'Test Notebook',
      description: 'Test description',
      slug: 'test-notebook',
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      datasources: [],
      cells: [],
    };

    await repository.create(notebook);

    const result = await service.execute(notebook.slug);

    expect(result).toBeDefined();
    expect(result.id).toBe(notebook.id);
    expect(result.title).toBe(notebook.title);
    expect(result.description).toBe(notebook.description);
    expect(result.slug).toBe(notebook.slug);
    expect(result.projectId).toBe(notebook.projectId);
  });

  it('should throw DomainException when notebook not found by slug', async () => {
    const repository = new MockNotebookRepository();
    const service = new GetNotebookBySlugService(repository);

    await expect(service.execute('nonexistent-slug')).rejects.toThrow(
      DomainException,
    );
    await expect(service.execute('nonexistent-slug')).rejects.toThrow(
      "Notebook with id 'nonexistent-slug' not found",
    );
  });

  it('should return notebook with all properties when found by slug', async () => {
    const repository = new MockNotebookRepository();
    const service = new GetNotebookBySlugService(repository);

    const notebook: Notebook = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      projectId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      title: 'Test Notebook',
      description: 'Test description',
      slug: 'test-notebook',
      version: 2,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
      datasources: ['ds1', 'ds2'],
      cells: [],
    };

    await repository.create(notebook);

    const result = await service.execute(notebook.slug);

    expect(result.id).toBe(notebook.id);
    expect(result.title).toBe(notebook.title);
    expect(result.description).toBe(notebook.description);
    expect(result.slug).toBe(notebook.slug);
    expect(result.version).toBe(notebook.version);
    expect(result.datasources).toEqual(notebook.datasources);
    expect(result.cells).toEqual(notebook.cells);
  });

  it('should handle notebook with cells and datasources when found by slug', async () => {
    const repository = new MockNotebookRepository();
    const service = new GetNotebookBySlugService(repository);

    const notebook: Notebook = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      projectId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      title: 'Test Notebook',
      description: 'Test description',
      slug: 'test-notebook',
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      datasources: ['ds1', 'ds2'],
      cells: [
        {
          query: 'SELECT 1',
          cellType: 'query',
          cellId: 1,
          datasources: ['ds1'],
          isActive: true,
          runMode: 'default',
        },
      ],
    };

    await repository.create(notebook);

    const result = await service.execute(notebook.slug);

    expect(result.datasources).toEqual(['ds1', 'ds2']);
    expect(result.cells).toHaveLength(1);
    expect(result.cells[0].query).toBe('SELECT 1');
  });

  it('should find correct notebook by slug when multiple notebooks exist', async () => {
    const repository = new MockNotebookRepository();
    const service = new GetNotebookBySlugService(repository);

    const notebook1: Notebook = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      projectId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      title: 'First Notebook',
      description: 'First description',
      slug: 'first-notebook',
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      datasources: [],
      cells: [],
    };

    const notebook2: Notebook = {
      id: '550e8400-e29b-41d4-a716-446655440001',
      projectId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      title: 'Second Notebook',
      description: 'Second description',
      slug: 'second-notebook',
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      datasources: [],
      cells: [],
    };

    await repository.create(notebook1);
    await repository.create(notebook2);

    const result = await service.execute('second-notebook');

    expect(result.id).toBe(notebook2.id);
    expect(result.title).toBe(notebook2.title);
    expect(result.slug).toBe(notebook2.slug);
  });
});
