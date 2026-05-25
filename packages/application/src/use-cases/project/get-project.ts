import type { Project, RepositoryFindOptions } from '@qwery/domain';
import type { ProjectRepoDeps } from './resolve-current-project';

export async function listProjects(
  deps: ProjectRepoDeps,
  options?: RepositoryFindOptions,
): Promise<Project[]> {
  return deps.projectRepo.findAll(options);
}

export async function getProject(deps: ProjectRepoDeps, id: string): Promise<Project | null> {
  return deps.projectRepo.findById(id);
}

export async function getProjectBySlug(deps: ProjectRepoDeps, slug: string): Promise<Project | null> {
  return deps.projectRepo.findBySlug(slug);
}
