import type {
  Agent,
  Artifact,
  ArtifactType,
  Datasource,
  IAgentRepository,
  IArtifactRepository,
  IDatasourceRepository,
  IMessageRepository,
  ISessionRepository,
  IUsageRepository,
  Message,
  PaginatedResult,
  PaginationOptions,
  QueryArtifact,
  RepositoryFindOptions,
  Session,
  Usage,
} from '@qwery/domain';

interface HasId {
  id: string;
  slug?: string;
}

abstract class InMemoryBase<T extends HasId> {
  protected store = new Map<string, T>();

  async findAll(_options?: RepositoryFindOptions): Promise<T[]> {
    return Array.from(this.store.values());
  }
  async findById(id: string): Promise<T | null> {
    return this.store.get(id) ?? null;
  }
  async findBySlug(slug: string): Promise<T | null> {
    for (const v of this.store.values()) if (v.slug === slug) return v;
    return null;
  }
  async create(entity: T): Promise<T> {
    this.store.set(entity.id, entity);
    return entity;
  }
  async update(entity: T): Promise<T> {
    this.store.set(entity.id, entity);
    return entity;
  }
  async delete(id: string): Promise<boolean> {
    return this.store.delete(id);
  }
  shortenId(id: string): string {
    return id.slice(0, 8);
  }
}

export class InMemorySessionRepo extends InMemoryBase<Session> implements ISessionRepository {
  async findByDatasourceId(datasourceId: string): Promise<Session[]> {
    return Array.from(this.store.values()).filter((s) => s.datasources.includes(datasourceId));
  }
}

export class InMemoryDatasourceRepo extends InMemoryBase<Datasource> implements IDatasourceRepository {}

export class InMemoryMessageRepo extends InMemoryBase<Message> implements IMessageRepository {
  async findBySessionId(sessionId: string): Promise<Message[]> {
    return Array.from(this.store.values()).filter((m) => m.sessionId === sessionId);
  }
  async findBySessionIdPaginated(
    sessionId: string,
    options: PaginationOptions,
  ): Promise<PaginatedResult<Message>> {
    const all = (await this.findBySessionId(sessionId)).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
    const cutoff = options.cursor ? new Date(options.cursor).getTime() : Infinity;
    const filtered = all.filter((m) => m.createdAt.getTime() < cutoff);
    const slice = filtered.slice(0, options.limit);
    const oldest = slice[slice.length - 1];
    return {
      messages: slice,
      nextCursor: oldest ? oldest.createdAt.toISOString() : null,
      hasMore: filtered.length > slice.length,
    };
  }
}

export class InMemoryAgentRepo extends InMemoryBase<Agent> implements IAgentRepository {
  async findByCapability(toolName: string): Promise<Agent[]> {
    return Array.from(this.store.values()).filter((a) => a.capabilities.includes(toolName));
  }
}

export class InMemoryUsageRepo extends InMemoryBase<Usage> implements IUsageRepository {
  async findBySessionId(sessionId: string): Promise<Usage[]> {
    return Array.from(this.store.values()).filter((u) => u.sessionId === sessionId);
  }
}

export class InMemoryArtifactRepo extends InMemoryBase<Artifact> implements IArtifactRepository {
  async findByType<T extends ArtifactType>(type: T): Promise<Extract<Artifact, { type: T }>[]> {
    return Array.from(this.store.values()).filter((a) => a.type === type) as Extract<Artifact, { type: T }>[];
  }
  async findByTag(tag: string): Promise<Artifact[]> {
    return Array.from(this.store.values()).filter((a) => a.tags.includes(tag));
  }
  async findByDatasourceId(datasourceId: string): Promise<Artifact[]> {
    return Array.from(this.store.values()).filter((a) => a.datasourceIds.includes(datasourceId));
  }
  async search(query: string, options?: { limit?: number; type?: ArtifactType }): Promise<Artifact[]> {
    const q = query.toLowerCase();
    let hits = Array.from(this.store.values()).filter((a) => {
      const sql = a.type === 'query' ? (a as QueryArtifact).sql : '';
      return (
        a.title.toLowerCase().includes(q) ||
        (a.description ?? '').toLowerCase().includes(q) ||
        a.tags.some((t) => t.toLowerCase().includes(q)) ||
        sql.toLowerCase().includes(q)
      );
    });
    if (options?.type) hits = hits.filter((a) => a.type === options.type);
    if (options?.limit !== undefined) hits = hits.slice(0, options.limit);
    return hits;
  }
}
