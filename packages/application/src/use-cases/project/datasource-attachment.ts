import type { Datasource, IDatasourceRepository, Project } from '@qwery/domain';
import type { ProjectRepoDeps } from './resolve-current-project';

export interface ProjectDatasourceDeps extends ProjectRepoDeps {
  datasourceRepo: IDatasourceRepository;
}

export async function attachDatasourceToProject(
  deps: ProjectRepoDeps,
  projectId: string,
  datasourceId: string,
): Promise<void> {
  return deps.projectRepo.attachDatasource(projectId, datasourceId);
}

export async function detachDatasourceFromProject(
  deps: ProjectRepoDeps,
  projectId: string,
  datasourceId: string,
): Promise<void> {
  return deps.projectRepo.detachDatasource(projectId, datasourceId);
}

/** Projects a datasource is attached to — used to show attachment badges. */
export async function listProjectsForDatasource(
  deps: ProjectRepoDeps,
  datasourceId: string,
): Promise<Project[]> {
  return deps.projectRepo.findByDatasourceId(datasourceId);
}

/** The datasources attached to a project, resolved to full entities. */
export async function listDatasourcesForProject(
  deps: ProjectDatasourceDeps,
  projectId: string,
): Promise<Datasource[]> {
  const ids = new Set(await deps.projectRepo.listDatasourceIds(projectId));
  if (ids.size === 0) return [];
  const all = await deps.datasourceRepo.findAll();
  return all.filter((d) => ids.has(d.id));
}
