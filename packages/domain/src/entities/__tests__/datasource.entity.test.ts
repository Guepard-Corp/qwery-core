import { describe, expect, test } from 'bun:test';
import { createDatasource, DatasourceSchema, updateDatasource } from '../datasource.entity';

describe('createDatasource', () => {
  test('assigns id, slug, timestamps and default empty description', () => {
    const ds = createDatasource({
      name: 'sales',
      datasource_provider: 'postgres',
      datasource_driver: 'duckdb-attach',
      config: { host: 'localhost' },
    });
    expect(ds.name).toBe('sales');
    expect(ds.description).toBe('');
    expect(ds.datasource_provider).toBe('postgres');
    expect(ds.config).toEqual({ host: 'localhost' });
    expect(ds.id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(ds.slug.length).toBeGreaterThan(0);
    expect(ds.createdAt).toBeInstanceOf(Date);
  });

  test('preserves the description when provided', () => {
    const ds = createDatasource({
      name: 'x',
      description: 'Production read-replica',
      datasource_provider: 'mysql',
      datasource_driver: 'duckdb-attach',
      config: {},
    });
    expect(ds.description).toBe('Production read-replica');
  });

  test('rejects an empty name', () => {
    expect(() =>
      createDatasource({
        name: '',
        datasource_provider: 'csv',
        datasource_driver: 'duckdb',
        config: {},
      }),
    ).toThrow();
  });

  test('rejects an empty provider', () => {
    expect(() =>
      createDatasource({
        name: 'x',
        datasource_provider: '',
        datasource_driver: 'duckdb',
        config: {},
      }),
    ).toThrow();
  });
});

describe('updateDatasource', () => {
  test('updates name and config, bumps updatedAt, preserves id+createdAt', async () => {
    const ds = createDatasource({
      name: 'old',
      datasource_provider: 'csv',
      datasource_driver: 'duckdb',
      config: { path: '/a' },
    });
    await new Promise((r) => setTimeout(r, 2));
    const next = updateDatasource(ds, {
      name: 'new',
      config: { path: '/b' },
    });
    expect(next.name).toBe('new');
    expect(next.config).toEqual({ path: '/b' });
    expect(next.id).toBe(ds.id);
    expect(next.createdAt.getTime()).toBe(ds.createdAt.getTime());
    expect(next.updatedAt.getTime()).toBeGreaterThan(ds.updatedAt.getTime());
  });

  test('partial update: omitted fields preserved', () => {
    const ds = createDatasource({
      name: 'sales',
      description: 'desc',
      datasource_provider: 'postgres',
      datasource_driver: 'duckdb-attach',
      config: { host: 'h' },
    });
    const next = updateDatasource(ds, { description: 'new desc' });
    expect(next.description).toBe('new desc');
    expect(next.name).toBe('sales');
    expect(next.config).toEqual({ host: 'h' });
  });
});

describe('DatasourceSchema', () => {
  test('rejects description longer than 1024 chars', () => {
    expect(() =>
      DatasourceSchema.parse({
        id: '00000000-0000-0000-0000-000000000000',
        name: 'x',
        description: 'a'.repeat(1025),
        slug: 's',
        datasource_provider: 'p',
        datasource_driver: 'd',
        config: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ).toThrow();
  });

  test('rejects an invalid uuid id', () => {
    expect(() =>
      DatasourceSchema.parse({
        id: 'not-a-uuid',
        name: 'x',
        description: '',
        slug: 's',
        datasource_provider: 'p',
        datasource_driver: 'd',
        config: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ).toThrow();
  });
});
