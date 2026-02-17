import type { Usage } from '@qwery/domain/entities';
import { RepositoryFindOptions } from '@qwery/domain/common';
import { IUsageRepository } from '@qwery/domain/repositories';
import * as Storage from './storage.js';

const ENTITY = 'usage';

type Row = Record<string, unknown>;

function serialize(usage: Usage): Row {
  const idValue = usage.id as string | number;
  return {
    id: typeof idValue === 'number' ? idValue : idValue,
    conversationId: usage.conversationId,
    projectId: usage.projectId,
    organizationId: usage.organizationId,
    userId: usage.userId,
    model: usage.model,
    inputTokens: usage.inputTokens ?? 0,
    outputTokens: usage.outputTokens ?? 0,
    totalTokens: usage.totalTokens ?? 0,
    reasoningTokens: usage.reasoningTokens ?? 0,
    cachedInputTokens: usage.cachedInputTokens ?? 0,
    cost: usage.cost ?? 0,
    contextSize: usage.contextSize ?? 0,
    creditsCap: usage.creditsCap ?? 0,
    creditsUsed: usage.creditsUsed ?? 0,
    cpu: usage.cpu ?? 0,
    memory: usage.memory ?? 0,
    network: usage.network ?? 0,
    gpu: usage.gpu ?? 0,
    storage: usage.storage ?? 0,
    timestamp: usage.timestamp ?? new Date(),
  };
}

function deserialize(row: Row): Usage {
  const idValue = row.id;
  return {
    id: (typeof idValue === 'number' ? idValue : idValue) as string & number,
    conversationId: row.conversationId as string,
    projectId: row.projectId as string,
    organizationId: row.organizationId as string,
    userId: row.userId as string,
    model: row.model as string,
    inputTokens: (row.inputTokens as number) ?? 0,
    outputTokens: (row.outputTokens as number) ?? 0,
    totalTokens: (row.totalTokens as number) ?? 0,
    reasoningTokens: (row.reasoningTokens as number) ?? 0,
    cachedInputTokens: (row.cachedInputTokens as number) ?? 0,
    cost: (row.cost as number) ?? 0,
    contextSize: (row.contextSize as number) ?? 0,
    creditsCap: (row.creditsCap as number) ?? 0,
    creditsUsed: (row.creditsUsed as number) ?? 0,
    cpu: (row.cpu as number) ?? 0,
    memory: (row.memory as number) ?? 0,
    network: (row.network as number) ?? 0,
    gpu: (row.gpu as number) ?? 0,
    storage: (row.storage as number) ?? 0,
    timestamp: (row.timestamp as Date) ?? new Date(),
  };
}

export class UsageRepository extends IUsageRepository {
  async findAll(options?: RepositoryFindOptions): Promise<Usage[]> {
    const keys = await Storage.list([ENTITY]);
    const items = await Promise.all(
      keys.map((key) => Storage.read<Row>(key).then(deserialize)),
    );
    items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    const offset = options?.offset ?? 0;
    const limit = options?.limit;
    return limit ? items.slice(offset, offset + limit) : items.slice(offset);
  }

  async findById(id: string): Promise<Usage | null> {
    try {
      const row = await Storage.read<Row>([ENTITY, id]);
      return deserialize(row);
    } catch {
      return null;
    }
  }

  async findBySlug(_slug: string): Promise<Usage | null> {
    return null;
  }

  async findByConversationId(conversationId: string): Promise<Usage[]> {
    const all = await this.findAll();
    const filtered = all.filter((u) => u.conversationId === conversationId);
    filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return filtered;
  }

  async findByConversationSlug(conversationSlug: string): Promise<Usage[]> {
    const convKeys = await Storage.list(['conversation']);
    for (const key of convKeys) {
      const conv = await Storage.read<Row>(key);
      const slug = conv.slug as string;
      if (slug === conversationSlug) {
        const conversationId = conv.id as string;
        return this.findByConversationId(conversationId);
      }
    }
    return [];
  }

  async create(entity: Usage): Promise<Usage> {
    const idValue = entity.id as string | number | undefined;
    const idNum =
      !idValue || idValue === '0' || idValue === 0
        ? Date.now()
        : typeof idValue === 'number'
          ? idValue
          : Number(idValue) || Number(idValue);
    const id = idNum;
    const entityWithId = { ...entity, id: id as string & number };
    await Storage.write([ENTITY, String(id)], serialize(entityWithId));
    return entityWithId as Usage;
  }

  async update(entity: Usage): Promise<Usage> {
    const existing = await this.findById(String(entity.id));
    if (!existing) {
      throw new Error(`Usage with id ${entity.id} not found`);
    }
    await Storage.write([ENTITY, String(entity.id)], serialize(entity));
    return entity;
  }

  async delete(id: string): Promise<boolean> {
    const existing = await this.findById(id);
    if (!existing) return false;
    await Storage.remove([ENTITY, id]);
    return true;
  }
}
