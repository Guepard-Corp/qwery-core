import { describe, expect, test } from 'bun:test';
import {
  createDatasource,
  deleteDatasource,
  getDatasource,
  getDatasourceBySlug,
  listDatasources,
  updateDatasource,
} from '../datasource';
import { InMemoryDatasourceRepo } from './repo-mocks';

function seed() {
  return { datasourceRepo: new InMemoryDatasourceRepo() };
}

describe('datasource use cases', () => {
  test('createDatasource persists', async () => {
    const deps = seed();
    const ds = await createDatasource(deps, {
      name: 'sales',
      datasource_provider: 'postgres',
      datasource_driver: 'duckdb-attach',
      config: {},
    });
    expect(await getDatasource(deps, ds.id)).toEqual(ds);
  });

  test('updateDatasource throws when not found', async () => {
    const deps = seed();
    await expect(updateDatasource(deps, 'missing', { name: 'x' })).rejects.toThrow(/not found/);
  });

  test('updateDatasource applies a patch', async () => {
    const deps = seed();
    const ds = await createDatasource(deps, {
      name: 'old',
      datasource_provider: 'csv',
      datasource_driver: 'duckdb',
      config: {},
    });
    const next = await updateDatasource(deps, ds.id, { name: 'new' });
    expect(next.name).toBe('new');
  });

  test('deleteDatasource removes', async () => {
    const deps = seed();
    const ds = await createDatasource(deps, {
      name: 'x',
      datasource_provider: 'csv',
      datasource_driver: 'duckdb',
      config: {},
    });
    expect(await deleteDatasource(deps, ds.id)).toBe(true);
  });

  test('getDatasourceBySlug returns null for unknown slug', async () => {
    const deps = seed();
    expect(await getDatasourceBySlug(deps, 'nope')).toBeNull();
  });

  test('listDatasources returns all', async () => {
    const deps = seed();
    await createDatasource(deps, {
      name: 'a',
      datasource_provider: 'csv',
      datasource_driver: 'duckdb',
      config: {},
    });
    await createDatasource(deps, {
      name: 'b',
      datasource_provider: 'csv',
      datasource_driver: 'duckdb',
      config: {},
    });
    expect(await listDatasources(deps)).toHaveLength(2);
  });
});
