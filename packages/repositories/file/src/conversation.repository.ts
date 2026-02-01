import { v4 as uuidv4 } from 'uuid';
import type { Conversation } from '@qwery/domain/entities';
import { RepositoryFindOptions } from '@qwery/domain/common';
import { IConversationRepository } from '@qwery/domain/repositories';
import * as Storage from './storage.js';

const ENTITY = 'conversation';

type Row = Record<string, unknown>;

function serialize(conversation: Conversation): Row {
  return {
    id: conversation.id,
    slug: conversation.slug,
    title: conversation.title,
    seedMessage: conversation.seedMessage ?? undefined,
    projectId: conversation.projectId,
    taskId: conversation.taskId,
    datasources: conversation.datasources,
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
    createdBy: conversation.createdBy,
    updatedBy: conversation.updatedBy,
    isPublic: conversation.isPublic ?? false,
    remixedFrom: conversation.remixedFrom ?? undefined,
  };
}

function deserialize(row: Row): Conversation {
  return {
    id: row.id as string,
    slug: row.slug as string,
    title: row.title as string,
    seedMessage: (row.seedMessage as string) ?? undefined,
    projectId: row.projectId as string,
    taskId: row.taskId as string,
    datasources: (row.datasources as string[]) ?? [],
    createdAt: new Date(row.createdAt as string),
    updatedAt: new Date(row.updatedAt as string),
    createdBy: row.createdBy as string,
    updatedBy: row.updatedBy as string,
    isPublic: (row.isPublic as boolean) ?? false,
    remixedFrom: (row.remixedFrom as string | null | undefined) ?? undefined,
  };
}

export class ConversationRepository extends IConversationRepository {
  async findAll(options?: RepositoryFindOptions): Promise<Conversation[]> {
    const keys = await Storage.list([ENTITY]);
    const items = await Promise.all(
      keys.map((key) => Storage.read<Row>(key).then(deserialize)),
    );
    const sorted = items.sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
    );
    const offset = options?.offset ?? 0;
    const limit = options?.limit;
    return limit ? sorted.slice(offset, offset + limit) : sorted.slice(offset);
  }

  async findById(id: string): Promise<Conversation | null> {
    try {
      const row = await Storage.read<Row>([ENTITY, id]);
      return deserialize(row);
    } catch {
      return null;
    }
  }

  async findBySlug(slug: string): Promise<Conversation | null> {
    const all = await this.findAll();
    return all.find((c) => c.slug === slug) ?? null;
  }

  async findByProjectId(projectId: string): Promise<Conversation[]> {
    const all = await this.findAll();
    return all.filter((c) => c.projectId === projectId);
  }

  async findByTaskId(taskId: string): Promise<Conversation[]> {
    const all = await this.findAll();
    return all.filter((c) => c.taskId === taskId);
  }

  async create(entity: Conversation): Promise<Conversation> {
    const now = new Date();
    const userId = 'system';
    const entityWithId = {
      ...entity,
      id: entity.id || uuidv4(),
      createdAt: entity.createdAt || now,
      updatedAt: entity.updatedAt || now,
      createdBy: entity.createdBy || userId,
      updatedBy: entity.updatedBy || userId,
    };
    const entityWithSlug = {
      ...entityWithId,
      slug: this.shortenId(entityWithId.id),
    };
    await Storage.write([ENTITY, entityWithSlug.id], serialize(entityWithSlug));
    return entityWithSlug;
  }

  async update(entity: Conversation): Promise<Conversation> {
    const existing = await this.findById(entity.id);
    if (!existing) {
      throw new Error(`Conversation with id ${entity.id} not found`);
    }
    const userId = 'system';
    const updated = {
      ...entity,
      updatedAt: entity.updatedAt || new Date(),
      updatedBy: entity.updatedBy || userId,
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
