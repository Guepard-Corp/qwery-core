import { describe, expect, test } from 'bun:test';
import { createDatasource } from '@qwery/domain';
import {
  attachDatasourceToProject,
  detachDatasourceFromProject,
  listDatasourcesForProject,
  listProjectsForDatasource,
  resolveCurrentProject,
} from '../project';
import { InMemoryDatasourceRepo, InMemoryProjectRepo } from './repo-mocks';

function seed() {
  return { projectRepo: new InMemoryProjectRepo(), datasourceRepo: new InMemoryDatasourceRepo() };
}

describe('project use cases', () => {
  test('resolveCurrentProject creates lazily then is idempotent by slug', async () => {
    const deps = seed();
    const first = await resolveCurrentProject(deps, '/Users/jane/work/app');
    expect(first.slug).toBe('-Users-jane-work-app');
    const second = await resolveCurrentProject(deps, '/Users/jane/work/app');
    expect(second.id).toBe(first.id); // same row, not a duplicate
    expect(await deps.projectRepo.findAll()).toHaveLength(1);
  });

  test('attach / list / detach datasources for a project', async () => {
    const deps = seed();
    const project = await resolveCurrentProject(deps, '/p');
    const ds = await deps.datasourceRepo.create(
      createDatasource({
        name: 'PG',
        datasource_provider: 'postgresql',
        datasource_driver: 'pg',
        config: {},
      }),
    );

    await attachDatasourceToProject(deps, project.id, ds.id);
    expect(await listDatasourcesForProject(deps, project.id)).toHaveLength(1);
    expect((await listProjectsForDatasource(deps, ds.id)).map((p) => p.id)).toEqual([project.id]);

    await detachDatasourceFromProject(deps, project.id, ds.id);
    expect(await listDatasourcesForProject(deps, project.id)).toHaveLength(0);
    expect(await listProjectsForDatasource(deps, ds.id)).toHaveLength(0);
  });
});
