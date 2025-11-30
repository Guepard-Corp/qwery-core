import { describe, expect, it } from 'vitest';
import { DomainException } from '../../../src/exceptions';
import type { Notebook } from '../../../src/entities/notebook.type';
import { INotebookRepository } from '../../../src/repositories/notebook-repository.port';
import { DeleteNotebookService } from '../../../src/services/notebook/delete-notebook.usecase';

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

describe('DeleteNotebookService', () => {
  const createTestNotebook = (): Notebook => ({
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
  });

  it('should delete notebook when found', async () => {
    const repository = new MockNotebookRepository();
    const service = new DeleteNotebookService(repository);

    const notebook = createTestNotebook();
    await repository.create(notebook);

    const result = await service.execute(notebook.id);

    expect(result).toBe(true);
    expect(await repository.findById(notebook.id)).toBeNull();
  });

  it('should throw DomainException when notebook not found', async () => {
    const repository = new MockNotebookRepository();
    const service = new DeleteNotebookService(repository);

    await expect(service.execute('nonexistent-id')).rejects.toThrow(
      DomainException,
    );
    await expect(service.execute('nonexistent-id')).rejects.toThrow(
      "Notebook with id 'nonexistent-id' not found",
    );
  });

  it('should return true when deletion succeeds', async () => {
    const repository = new MockNotebookRepository();
    const service = new DeleteNotebookService(repository);

    const notebook = createTestNotebook();
    await repository.create(notebook);

    const result = await service.execute(notebook.id);

    expect(result).toBe(true);
  });

  it('should not delete other notebooks', async () => {
    const repository = new MockNotebookRepository();
    const service = new DeleteNotebookService(repository);

    const notebook1 = createTestNotebook();
    const notebook2: Notebook = {
      ...createTestNotebook(),
      id: '550e8400-e29b-41d4-a716-446655440001',
      title: 'Another Notebook',
    };

    await repository.create(notebook1);
    await repository.create(notebook2);

    await service.execute(notebook1.id);

    expect(await repository.findById(notebook1.id)).toBeNull();
    expect(await repository.findById(notebook2.id)).toBeDefined();
  });
});
