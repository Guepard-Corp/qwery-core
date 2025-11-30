import { describe, expect, it } from 'vitest';
import type { Notebook } from '../../../src/entities/notebook.type';
import { INotebookRepository } from '../../../src/repositories/notebook-repository.port';
import { CreateNotebookService } from '../../../src/services/notebook/create-notebook.usecase';

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

describe('CreateNotebookService', () => {
  it('should create a new notebook with required fields', async () => {
    const repository = new MockNotebookRepository();
    const service = new CreateNotebookService(repository);

    const result = await service.execute({
      projectId: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Test Notebook',
    });

    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
    expect(result.projectId).toBe('550e8400-e29b-41d4-a716-446655440000');
    expect(result.title).toBe('Test Notebook');
    expect(result.slug).toBeDefined();
    expect(result.version).toBe(1);
    expect(result.datasources).toEqual([]);
    expect(result.cells).toHaveLength(1);
    expect(result.cells[0]).toMatchObject({
      cellId: 1,
      cellType: 'query',
      query: '',
      datasources: [],
      isActive: true,
      runMode: 'default',
    });
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.updatedAt).toBeInstanceOf(Date);
  });

  it('should create a new notebook with description', async () => {
    const repository = new MockNotebookRepository();
    const service = new CreateNotebookService(repository);

    const result = await service.execute({
      projectId: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Test Notebook',
      description: 'Test description',
    });

    expect(result).toBeDefined();
    expect(result.title).toBe('Test Notebook');
    expect(result.description).toBe('Test description');
  });

  it('should generate unique ids and slugs for different notebooks', async () => {
    const repository = new MockNotebookRepository();
    const service = new CreateNotebookService(repository);

    const result1 = await service.execute({
      projectId: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Notebook 1',
    });

    const result2 = await service.execute({
      projectId: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Notebook 2',
    });

    expect(result1.id).not.toBe(result2.id);
    expect(result1.slug).not.toBe(result2.slug);
  });

  it('should initialize with version 1', async () => {
    const repository = new MockNotebookRepository();
    const service = new CreateNotebookService(repository);

    const result = await service.execute({
      projectId: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Test Notebook',
    });

    expect(result.version).toBe(1);
  });

  it('should initialize with empty datasources and a default query cell', async () => {
    const repository = new MockNotebookRepository();
    const service = new CreateNotebookService(repository);

    const result = await service.execute({
      projectId: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Test Notebook',
    });

    expect(result.datasources).toEqual([]);
    expect(result.cells).toHaveLength(1);
    expect(result.cells[0]).toMatchObject({
      cellId: 1,
      cellType: 'query',
      query: '',
      datasources: [],
      isActive: true,
      runMode: 'default',
    });
  });

  it('should persist notebook to repository', async () => {
    const repository = new MockNotebookRepository();
    const service = new CreateNotebookService(repository);

    const result = await service.execute({
      projectId: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Test Notebook',
    });

    const saved = await repository.findById(result.id);
    expect(saved).toBeDefined();
    expect(saved?.title).toBe('Test Notebook');
  });

  it('should handle optional description field', async () => {
    const repository = new MockNotebookRepository();
    const service = new CreateNotebookService(repository);

    const resultWithoutDesc = await service.execute({
      projectId: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Notebook Without Description',
    });

    const resultWithDesc = await service.execute({
      projectId: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Notebook With Description',
      description: 'This has a description',
    });

    // Description is optional, so it might be undefined or empty string
    expect(
      resultWithoutDesc.description === undefined ||
        resultWithoutDesc.description === '',
    ).toBe(true);
    expect(resultWithDesc.description).toBe('This has a description');
  });
});
