import { describe, expect, it } from 'vitest';
import { CellType } from '../../../src/enums/cellType';
import { RunMode } from '../../../src/enums/runMode';
import { DomainException } from '../../../src/exceptions';
import type { Notebook } from '../../../src/entities/notebook.type';
import { INotebookRepository } from '../../../src/repositories/notebook-repository.port';
import { UpdateNotebookService } from '../../../src/services/notebook/update-notebook.usecase';

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

describe('UpdateNotebookService', () => {
  const createTestNotebook = (): Notebook => ({
    id: '550e8400-e29b-41d4-a716-446655440000',
    projectId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
    title: 'Original Title',
    description: 'Original description',
    slug: 'original-slug',
    version: 1,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    datasources: [],
    cells: [],
  });

  it('should update notebook title', async () => {
    const repository = new MockNotebookRepository();
    const service = new UpdateNotebookService(repository);

    const notebook = createTestNotebook();
    await repository.create(notebook);

    const result = await service.execute({
      id: notebook.id,
      title: 'Updated Title',
    });

    expect(result.title).toBe('Updated Title');
    expect(result.description).toBe(notebook.description);
    expect(result.updatedAt.getTime()).toBeGreaterThan(
      notebook.updatedAt.getTime(),
    );
  });

  it('should update notebook description', async () => {
    const repository = new MockNotebookRepository();
    const service = new UpdateNotebookService(repository);

    const notebook = createTestNotebook();
    await repository.create(notebook);

    const result = await service.execute({
      id: notebook.id,
      description: 'Updated description',
    });

    expect(result.description).toBe('Updated description');
    expect(result.title).toBe(notebook.title);
  });

  it('should update notebook datasources', async () => {
    const repository = new MockNotebookRepository();
    const service = new UpdateNotebookService(repository);

    const notebook = createTestNotebook();
    await repository.create(notebook);

    const result = await service.execute({
      id: notebook.id,
      datasources: ['ds1', 'ds2', 'ds3'],
    });

    expect(result.datasources).toEqual(['ds1', 'ds2', 'ds3']);
  });

  it('should update notebook cells', async () => {
    const repository = new MockNotebookRepository();
    const service = new UpdateNotebookService(repository);

    const notebook = createTestNotebook();
    await repository.create(notebook);

    const newCells = [
      {
        query: 'SELECT * FROM users',
        cellType: 'query' as CellType,
        cellId: 1,
        datasources: ['ds1'],
        isActive: true,
        runMode: 'default' as RunMode,
      },
    ];

    const result = await service.execute({
      id: notebook.id,
      cells: newCells,
    });

    expect(result.cells).toHaveLength(1);
    expect(result.cells[0].query).toBe('SELECT * FROM users');
    expect(result.cells[0].cellType).toBe('query');
  });

  it('should update multiple fields at once', async () => {
    const repository = new MockNotebookRepository();
    const service = new UpdateNotebookService(repository);

    const notebook = createTestNotebook();
    await repository.create(notebook);

    const result = await service.execute({
      id: notebook.id,
      title: 'New Title',
      description: 'New description',
      datasources: ['ds1'],
    });

    expect(result.title).toBe('New Title');
    expect(result.description).toBe('New description');
    expect(result.datasources).toEqual(['ds1']);
  });

  it('should throw DomainException when notebook not found', async () => {
    const repository = new MockNotebookRepository();
    const service = new UpdateNotebookService(repository);

    await expect(
      service.execute({
        id: 'nonexistent-id',
        title: 'New Title',
      }),
    ).rejects.toThrow(DomainException);
    await expect(
      service.execute({
        id: 'nonexistent-id',
        title: 'New Title',
      }),
    ).rejects.toThrow("Notebook with id 'nonexistent-id' not found");
  });

  it('should preserve existing fields when updating partial data', async () => {
    const repository = new MockNotebookRepository();
    const service = new UpdateNotebookService(repository);

    const notebook: Notebook = {
      ...createTestNotebook(),
      datasources: ['existing-ds'],
      cells: [
        {
          query: 'SELECT 1',
          cellType: 'query' as CellType,
          cellId: 1,
          datasources: ['ds1'],
          isActive: true,
          runMode: 'default' as RunMode,
        },
      ],
    };
    await repository.create(notebook);

    const result = await service.execute({
      id: notebook.id,
      title: 'Updated Title',
    });

    expect(result.title).toBe('Updated Title');
    expect(result.datasources).toEqual(['existing-ds']);
    expect(result.cells).toHaveLength(1);
    expect(result.projectId).toBe(notebook.projectId);
  });

  it('should update updatedAt timestamp', async () => {
    const repository = new MockNotebookRepository();
    const service = new UpdateNotebookService(repository);

    const notebook = createTestNotebook();
    const originalUpdatedAt = notebook.updatedAt;
    await repository.create(notebook);

    // Wait a bit to ensure timestamp difference
    await new Promise((resolve) => setTimeout(resolve, 10));

    const result = await service.execute({
      id: notebook.id,
      title: 'Updated Title',
    });

    expect(result.updatedAt.getTime()).toBeGreaterThan(
      originalUpdatedAt.getTime(),
    );
  });

  it('should handle updating with empty cells array', async () => {
    const repository = new MockNotebookRepository();
    const service = new UpdateNotebookService(repository);

    const notebook: Notebook = {
      ...createTestNotebook(),
      cells: [
        {
          query: 'SELECT 1',
          cellType: 'query' as CellType,
          cellId: 1,
          datasources: ['ds1'],
          isActive: true,
          runMode: 'default' as RunMode,
        },
      ],
    };
    await repository.create(notebook);

    const result = await service.execute({
      id: notebook.id,
      cells: [],
    });

    expect(result.cells).toEqual([]);
  });
});
