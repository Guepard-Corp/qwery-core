import type { Nullable } from '@qwery/domain/common';
import type { RepositoryFindOptions } from '@qwery/domain/common';
import type { Project } from '@qwery/domain/entities';
import { IProjectRepository } from '@qwery/domain/repositories';

export class ProjectRepository extends IProjectRepository {
  private projects = new Map<string, Project>();

  async findAll(options?: RepositoryFindOptions): Promise<Project[]> {
    const allProjects = Array.from(this.projects.values());
    const offset = options?.offset ?? 0;
    const limit = options?.limit;

    if (limit) {
      return allProjects.slice(offset, offset + limit);
    }
    return allProjects.slice(offset);
  }

  async findById(id: string): Promise<Nullable<Project>> {
    return this.projects.get(id) ?? null;
  }

  async findBySlug(slug: string): Promise<Nullable<Project>> {
    const projects = Array.from(this.projects.values());
    return projects.find((project) => project.slug === slug) ?? null;
  }

  async create(entity: Project): Promise<Project> {
    this.projects.set(entity.id, entity);
    return entity;
  }

  async update(entity: Project): Promise<Project> {
    if (!this.projects.has(entity.id)) {
      throw new Error(`Project with id ${entity.id} not found`);
    }
    this.projects.set(entity.id, entity);
    return entity;
  }

  async delete(id: string): Promise<boolean> {
    return this.projects.delete(id);
  }
}
