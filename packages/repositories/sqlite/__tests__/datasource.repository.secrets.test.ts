import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { z } from 'zod';

import { DatasourceKind, type Datasource } from '@qwery/domain/entities';

import { DatasourceRepository } from '../src/datasource.repository';
import { ProjectRepository } from '../src/project.repository';

const mockGet = vi.fn();
vi.mock('@qwery/extensions-sdk', () => ({
  ExtensionsRegistry: {
    get: (...args: unknown[]) => mockGet(...args),
  },
  DatasourceExtension: {},
}));

vi.mock('@qwery/domain/utils', () => ({
  getSecretFields: () => ['password'],
}));

describe('DatasourceRepository Secrets', () => {
  let repository: DatasourceRepository;
  let projectRepository: ProjectRepository;
  let testDbPath: string;
  let testProjectId: string;

  beforeEach(async () => {
    testDbPath = join(
      tmpdir(),
      `test-secrets-${Date.now()}-${Math.random().toString(36).substring(7)}.db`,
    );
    repository = new DatasourceRepository(testDbPath);
    projectRepository = new ProjectRepository(testDbPath);

    testProjectId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
    await projectRepository.create({
      id: testProjectId,
      organizationId: testProjectId,
      name: 'Test Project',
      slug: 'test-project',
      description: '',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'test',
      updatedBy: 'test',
    });

    // Default mock: postgres has a secret 'password'
    mockGet.mockReturnValue({
      id: 'postgres',
      schema: z.object({
        host: z.string(),
        password: z.string().describe('secret:true'),
      }),
    });
  });

  afterEach(async () => {
    await repository.close();
    await projectRepository.close();
    try {
      unlinkSync(testDbPath);
    } catch {
      // Ignore
    }
    vi.clearAllMocks();
  });

  it('should encrypt secrets when creating a datasource', async () => {
    const ds: Datasource = {
      id: 'ds-1',
      projectId: testProjectId,
      name: 'My DB',
      slug: 'my-db',
      description: '',
      datasource_provider: 'postgres',
      datasource_driver: 'pg',
      datasource_kind: DatasourceKind.REMOTE,
      config: { host: 'localhost', password: 'plain-password' },
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
      createdBy: 'test',
      updatedBy: 'test',
    };

    const created = await repository.create(ds);

    // The returned object should HAVE plain text (transparent to the app)
    expect(created.config.password).toBe('plain-password');

    // But in the DB it should be encrypted
    // @ts-expect-error - testing private db instance
    const db = repository.db;
    const row = db
      .prepare('SELECT datasource_config FROM datasources WHERE id = ?')
      .get('ds-1') as { datasource_config: string };
    const configInDb = JSON.parse(row.datasource_config);
    expect(configInDb.password).toMatch(/^enc:/);
    expect(configInDb.password).not.toBe('plain-password');
  });

  it('should decrypt secrets when loading a datasource', async () => {
    const ds: Datasource = {
      id: 'ds-2',
      projectId: testProjectId,
      name: 'My DB 2',
      slug: 'my-db-2',
      description: '',
      datasource_provider: 'postgres',
      datasource_driver: 'pg',
      datasource_kind: DatasourceKind.REMOTE,
      config: { host: 'localhost', password: 'secret-to-be-encrypted' },
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
      createdBy: 'test',
      updatedBy: 'test',
    };

    await repository.create(ds);

    // Reset cache/repository instance to ensure clean load
    await repository.close();
    const newRepo = new DatasourceRepository(testDbPath);

    const loaded = await newRepo.findById('ds-2');
    expect(loaded?.config.password).toBe('secret-to-be-encrypted');
    await newRepo.close();
  });

  it('should not re-encrypt already protected secrets', async () => {
    const ds: Datasource = {
      id: 'ds-3',
      projectId: testProjectId,
      name: 'My DB 3',
      slug: 'my-db-3',
      description: '',
      datasource_provider: 'postgres',
      datasource_driver: 'pg',
      datasource_kind: DatasourceKind.REMOTE,
      config: { host: 'localhost', password: 'plain-password' },
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
      createdBy: 'test',
      updatedBy: 'test',
    };

    const created = await repository.create(ds);

    // Update something else
    const updated = await repository.update({
      ...created,
      name: 'Updated Name',
    });

    // @ts-expect-error - testing private db instance
    const db = repository.db;
    const secondEncrypted = (
      db
        .prepare('SELECT datasource_config FROM datasources WHERE id = ?')
        .get('ds-3') as { datasource_config: string }
    ).datasource_config;

    // The encrypted string should still be protected
    expect(JSON.parse(secondEncrypted).password).toMatch(/^enc:/);
    expect(updated.config.password).toBe('plain-password');
  });
});
