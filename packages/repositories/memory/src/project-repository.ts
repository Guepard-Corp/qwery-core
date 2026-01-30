import type { Nullable } from '@qwery/domain/common';
import type { RepositoryFindOptions } from '@qwery/domain/common';
import type { Project } from '@qwery/domain/entities';
import { IProjectRepository } from '@qwery/domain/repositories';

export class ProjectRepository extends IProjectRepository {
  private projects = new Map<string, Project>();

  async search(
    query: string,
    options?: RepositoryFindOptions & { organizationId?: string },
  ): Promise<Project[]> {
    const q = query.trim().toLowerCase();
    const all = Array.from(this.projects.values());
    const scoped = options?.organizationId
      ? all.filter((p) => p.organizationId === options.organizationId)
      : all;

    const filtered = q
      ? scoped.filter((project) => {
          const name = project.name?.toLowerCase() ?? '';
          const slug = project.slug?.toLowerCase() ?? '';
          const description = project.description?.toLowerCase() ?? '';
          return (
            name.includes(q) || slug.includes(q) || description.includes(q)
          );
        })
      : scoped;

    const offset = options?.offset ?? 0;
    const limit = options?.limit;
    return limit
      ? filtered.slice(offset, offset + limit)
      : filtered.slice(offset);
  }

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

  async findAllByOrganizationId(orgId: string): Promise<Project[]> {
    const projects = Array.from(this.projects.values());
    return projects.filter((project) => project.organizationId === orgId);
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
