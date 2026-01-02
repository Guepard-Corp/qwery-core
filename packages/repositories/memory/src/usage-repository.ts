import type { Nullable } from '@qwery/domain/common';
import type { RepositoryFindOptions } from '@qwery/domain/common';
import type { Usage } from '@qwery/domain/entities';
import { IUsageRepository } from '@qwery/domain/repositories';

export class UsageRepository extends IUsageRepository {
  private usages = new Map<string, Usage>();

  async findAll(options?: RepositoryFindOptions): Promise<Usage[]> {
    const allUsages = Array.from(this.usages.values());
    const offset = options?.offset ?? 0;
    const limit = options?.limit;

    if (options?.order) {
      // Simple ordering - in a real implementation, you'd parse the order string
      allUsages.sort((a, b) => {
        if (options.order?.includes('DESC')) {
          return b.id.localeCompare(a.id);
        }
        return a.id.localeCompare(b.id);
      });
    } else {
      // Default to time series order (newest first)
      allUsages.sort((a, b) => b.id.localeCompare(a.id));
    }

    if (limit) {
      return allUsages.slice(offset, offset + limit);
    }
    return allUsages.slice(offset);
  }

  async findById(id: string): Promise<Nullable<Usage>> {
    return this.usages.get(id) ?? null;
  }

  async findBySlug(_slug: string): Promise<Nullable<Usage>> {
    // Usage doesn't have slugs, but we need to implement this for the interface
    return null;
  }

  async findByConversationId(conversationId: string): Promise<Usage[]> {
    const usages = Array.from(this.usages.values());
    return usages
      .filter((usage) => usage.conversationId === conversationId)
      .sort((a, b) => b.id.localeCompare(a.id));
  }

  async findByConversationSlug(_conversationSlug: string): Promise<Usage[]> {
    // Memory repository doesn't have access to conversation repository
    // This method requires conversation lookup which is not available in memory implementation
    // For testing purposes, return empty array
    // In real usage, this should be handled by the service layer
    return [];
  }

  async create(entity: Usage): Promise<Usage> {
    // Generate ID if not provided
    const entityWithId = {
      ...entity,
      id: entity.id ?? crypto.randomUUID(),
    };
    this.usages.set(entityWithId.id, entityWithId);
    return entityWithId;
  }

  async update(entity: Usage): Promise<Usage> {
    if (!this.usages.has(entity.id)) {
      throw new Error(`Usage with id ${entity.id} not found`);
    }
    this.usages.set(entity.id, entity);
    return entity;
  }

  async delete(id: string): Promise<boolean> {
    return this.usages.delete(id);
  }
}
