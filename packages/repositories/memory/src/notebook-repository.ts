import type { Nullable } from '@qwery/domain/common';
import type { RepositoryFindOptions } from '@qwery/domain/common';
import type { Notebook } from '@qwery/domain/entities';
import { NotebookRepositoryPort } from '@qwery/domain/repositories';

export class NotebookRepository extends NotebookRepositoryPort {
  private notebooks = new Map<string, Notebook>();

  async findAll(options?: RepositoryFindOptions): Promise<Notebook[]> {
    const allNotebooks = Array.from(this.notebooks.values());
    const offset = options?.offset ?? 0;
    const limit = options?.limit;

    if (limit) {
      return allNotebooks.slice(offset, offset + limit);
    }
    return allNotebooks.slice(offset);
  }

  async findById(id: string): Promise<Nullable<Notebook>> {
    return this.notebooks.get(id) ?? null;
  }

  async findBySlug(slug: string): Promise<Nullable<Notebook>> {
    const notebooks = Array.from(this.notebooks.values());
    return notebooks.find((notebook) => notebook.slug === slug) ?? null;
  }

  async findByProjectId(projectId: string): Promise<Notebook | null> {
    const notebooks = Array.from(this.notebooks.values());
    return (
      notebooks.find((notebook) => notebook.projectId === projectId) ?? null
    );
  }

  async create(entity: Notebook): Promise<Notebook> {
    this.notebooks.set(entity.id, entity);
    return entity;
  }

  async update(entity: Notebook): Promise<Notebook> {
    if (!this.notebooks.has(entity.id)) {
      throw new Error(`Notebook with id ${entity.id} not found`);
    }
    this.notebooks.set(entity.id, entity);
    return entity;
  }

  async delete(id: string): Promise<boolean> {
    return this.notebooks.delete(id);
  }
}
