import { createProject, type IProjectRepository, type Project, projectSlugFromPath } from '@qwery/domain';

export interface ProjectRepoDeps {
  projectRepo: IProjectRepository;
}

/**
 * Resolve the project for a working directory, creating it lazily the first
 * time qwery runs there. `cwd` should be the canonical absolute path; the slug
 * is derived from it and used as the lookup key.
 */
export async function resolveCurrentProject(deps: ProjectRepoDeps, cwd: string): Promise<Project> {
  const slug = projectSlugFromPath(cwd);
  const existing = await deps.projectRepo.findBySlug(slug);
  if (existing) return existing;
  return deps.projectRepo.create(createProject({ path: cwd }));
}
