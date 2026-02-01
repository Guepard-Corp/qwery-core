import { v4 as uuidv4 } from 'uuid';
import type { Notebook } from '@qwery/domain/entities';
import { INotebookRepository } from '@qwery/domain/repositories';
import * as Storage from './storage.js';

const ENTITY = 'notebook';

type Row = Record<string, unknown>;

function serialize(notebook: Notebook): Row {
  return {
    id: notebook.id,
    slug: notebook.slug,
    title: notebook.title,
    description: notebook.description ?? undefined,
    projectId: notebook.projectId,
    datasources: notebook.datasources,
    cells: notebook.cells,
    version: notebook.version ?? 1,
    createdAt: notebook.createdAt.toISOString(),
    updatedAt: notebook.updatedAt.toISOString(),
    createdBy: notebook.createdBy ?? undefined,
    isPublic: notebook.isPublic ?? false,
    remixedFrom: notebook.remixedFrom ?? undefined,
  };
}

function deserialize(row: Row): Notebook {
  const rawDescription = row.description;
  const normalizedDescription =
    typeof rawDescription === 'string' &&
    String(rawDescription).trim().length > 0
      ? (rawDescription as string)
      : undefined;
  return {
    id: row.id as string,
    slug: row.slug as string,
    title: row.title as string,
    description: normalizedDescription,
    projectId: row.projectId as string,
    datasources: (row.datasources as string[]) ?? [],
    cells: (row.cells as Notebook['cells']) ?? [],
    version: (row.version as number) ?? 1,
    createdAt: new Date(row.createdAt as string),
    updatedAt: new Date(row.updatedAt as string),
    createdBy: (row.createdBy as string) ?? undefined,
    isPublic: (row.isPublic as boolean) ?? false,
    remixedFrom: (row.remixedFrom as string | null | undefined) ?? undefined,
  };
}

export class NotebookRepository extends INotebookRepository {
  async findAll(): Promise<Notebook[]> {
    const keys = await Storage.list([ENTITY]);
    const items = await Promise.all(
      keys.map((key) => Storage.read<Row>(key).then(deserialize)),
    );
    return items;
  }

  async findById(id: string): Promise<Notebook | null> {
    try {
      const row = await Storage.read<Row>([ENTITY, id]);
      return deserialize(row);
    } catch {
      return null;
    }
  }

  async findBySlug(slug: string): Promise<Notebook | null> {
    const all = await this.findAll();
    return all.find((n) => n.slug === slug) ?? null;
  }

  async findByProjectId(projectId: string): Promise<Notebook[] | null> {
    const all = await this.findAll();
    const filtered = all.filter((n) => n.projectId === projectId);
    return filtered.length > 0 ? filtered : null;
  }

  async create(entity: Notebook): Promise<Notebook> {
    const now = new Date();
    const entityWithId = {
      ...entity,
      id: entity.id || uuidv4(),
      createdAt: entity.createdAt || now,
      updatedAt: entity.updatedAt || now,
      version: entity.version ?? 1,
    };
    const entityWithSlug = {
      ...entityWithId,
      slug: this.shortenId(entityWithId.id),
    };
    await Storage.write([ENTITY, entityWithSlug.id], serialize(entityWithSlug));
    return entityWithSlug;
  }

  async update(entity: Notebook): Promise<Notebook> {
    const existing = await this.findById(entity.id);
    if (!existing) {
      throw new Error(`Notebook with id ${entity.id} not found`);
    }
    const updated = {
      ...entity,
      updatedAt: entity.updatedAt || new Date(),
      slug: this.shortenId(entity.id),
    };
    await Storage.write([ENTITY, entity.id], serialize(updated));
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const existing = await this.findById(id);
    if (!existing) return false;
    await Storage.remove([ENTITY, id]);
    return true;
  }
}
