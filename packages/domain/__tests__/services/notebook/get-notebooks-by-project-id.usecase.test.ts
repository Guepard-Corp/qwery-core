import { describe, expect, it } from 'vitest';
import type { Notebook } from '../../../src/entities/notebook.type';
import { INotebookRepository } from '../../../src/repositories/notebook-repository.port';
import { GetNotebooksByProjectIdService } from '../../../src/services/notebook/get-notebooks-by-project-id.usecase';

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

describe('GetNotebooksByProjectIdService', () => {
  const projectId1 = '550e8400-e29b-41d4-a716-446655440000';
  const projectId2 = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

  const createTestNotebook = (
    id: string,
    projectId: string,
    title: string,
  ): Notebook => ({
    id,
    projectId,
    title,
    description: 'Test description',
    slug: `notebook-${id.slice(0, 8)}`,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    datasources: [],
    cells: [],
  });

  it('should return empty array when no notebooks found for project', async () => {
    const repository = new MockNotebookRepository();
    const service = new GetNotebooksByProjectIdService(repository);

    const result = await service.execute(projectId1);

    expect(result).toEqual([]);
  });

  it('should return all notebooks for a project', async () => {
    const repository = new MockNotebookRepository();
    const service = new GetNotebooksByProjectIdService(repository);

    const notebook1 = createTestNotebook('id1', projectId1, 'Notebook 1');
    const notebook2 = createTestNotebook('id2', projectId1, 'Notebook 2');
    const notebook3 = createTestNotebook('id3', projectId1, 'Notebook 3');

    await repository.create(notebook1);
    await repository.create(notebook2);
    await repository.create(notebook3);

    const result = await service.execute(projectId1);

    expect(result).toHaveLength(3);
    expect(result.map((n) => n.id)).toContain(notebook1.id);
    expect(result.map((n) => n.id)).toContain(notebook2.id);
    expect(result.map((n) => n.id)).toContain(notebook3.id);
  });

  it('should only return notebooks for the specified project', async () => {
    const repository = new MockNotebookRepository();
    const service = new GetNotebooksByProjectIdService(repository);

    const notebook1 = createTestNotebook(
      'id1',
      projectId1,
      'Project 1 Notebook',
    );
    const notebook2 = createTestNotebook(
      'id2',
      projectId2,
      'Project 2 Notebook',
    );

    await repository.create(notebook1);
    await repository.create(notebook2);

    const result = await service.execute(projectId1);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(notebook1.id);
    expect(result[0].projectId).toBe(projectId1);
  });

  it('should return empty array when repository returns null', async () => {
    const repository = new MockNotebookRepository();
    const service = new GetNotebooksByProjectIdService(repository);

    // Mock repository to return null
    repository.findByProjectId = async () => null;

    const result = await service.execute(projectId1);

    expect(result).toEqual([]);
  });

  it('should return notebooks with all properties', async () => {
    const repository = new MockNotebookRepository();
    const service = new GetNotebooksByProjectIdService(repository);

    const notebook = createTestNotebook('id1', projectId1, 'Test Notebook');
    await repository.create(notebook);

    const result = await service.execute(projectId1);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(notebook.id);
    expect(result[0].title).toBe(notebook.title);
    expect(result[0].projectId).toBe(notebook.projectId);
    expect(result[0].description).toBe(notebook.description);
    expect(result[0].slug).toBe(notebook.slug);
    expect(result[0].version).toBe(notebook.version);
  });

  it('should return notebooks in correct order', async () => {
    const repository = new MockNotebookRepository();
    const service = new GetNotebooksByProjectIdService(repository);

    const notebook1 = createTestNotebook('id1', projectId1, 'Notebook 1');
    const notebook2 = createTestNotebook('id2', projectId1, 'Notebook 2');
    const notebook3 = createTestNotebook('id3', projectId1, 'Notebook 3');

    await repository.create(notebook1);
    await repository.create(notebook2);
    await repository.create(notebook3);

    const result = await service.execute(projectId1);

    expect(result).toHaveLength(3);
    // Should return all notebooks for the project
    const ids = result.map((n) => n.id);
    expect(ids).toContain(notebook1.id);
    expect(ids).toContain(notebook2.id);
    expect(ids).toContain(notebook3.id);
  });

  it('should handle project with many notebooks', async () => {
    const repository = new MockNotebookRepository();
    const service = new GetNotebooksByProjectIdService(repository);

    // Create 10 notebooks for the same project
    for (let i = 0; i < 10; i++) {
      const notebook = createTestNotebook(
        `id${i}`,
        projectId1,
        `Notebook ${i}`,
      );
      await repository.create(notebook);
    }

    const result = await service.execute(projectId1);

    expect(result).toHaveLength(10);
  });
});
