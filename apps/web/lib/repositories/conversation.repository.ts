import { RepositoryFindOptions } from '@qwery/domain/common';
import type { Conversation } from '@qwery/domain/entities';
import { IConversationRepository } from '@qwery/domain/repositories';
import { apiDelete, apiGet, apiPost, apiPut } from './api-client';

export class ConversationRepository extends IConversationRepository {
  async findAll(_options?: RepositoryFindOptions): Promise<Conversation[]> {
    const result = await apiGet<Conversation[]>('/conversations', false);
    return result || [];
  }

  async findById(id: string): Promise<Conversation | null> {
    return apiGet<Conversation>(`/conversations/${id}`, true);
  }

  async findBySlug(slug: string): Promise<Conversation | null> {
    return apiGet<Conversation>(`/conversations/${slug}`, true);
  }

  async findByProjectId(projectId: string): Promise<Conversation[]> {
    const result = await apiGet<Conversation[]>(
      `/conversations/project/${projectId}`,
      true,
    );
    return result || [];
  }

  async findByTaskId(taskId: string): Promise<Conversation[]> {
    const result = await apiGet<Conversation[]>(
      `/conversations/task/${taskId}`,
      true,
    );
    return result || [];
  }

  async create(entity: Conversation): Promise<Conversation> {
    return apiPost<Conversation>('/conversations', entity);
  }

  async update(entity: Conversation): Promise<Conversation> {
    return apiPut<Conversation>(`/conversations/${entity.id}`, entity);
  }

  async delete(id: string): Promise<boolean> {
    return apiDelete(`/conversations/${id}`);
  }
}
