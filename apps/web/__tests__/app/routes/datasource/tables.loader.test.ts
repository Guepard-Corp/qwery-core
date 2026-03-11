import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { Route } from '~/types/app/routes/datasource/+types/tables';
import { GetDatasourceBySlugService } from '@qwery/domain/services';

import * as CreateRepositories from '~/lib/loaders/create-repositories';
import { loader } from '../../../../app/routes/datasource/tables';

vi.mock('~/lib/loaders/create-repositories');

function createArgs(slug?: string): Route.LoaderArgs {
  return {
    params: { slug },
    request: new Request('https://example.test/ds'),
    context: {},
  } as Route.LoaderArgs;
}

describe('datasource/tables loader', () => {
  const getRepositoriesForLoaderMock = vi.mocked(
    CreateRepositories.getRepositoriesForLoader,
  );

  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('throws 404 when slug is missing', async () => {
    await expect(loader(createArgs(undefined))).rejects.toMatchObject({
      status: 404,
    });
  });

  it('returns datasource when service succeeds', async () => {
    const datasource = { id: 'ds-1', slug: 'ds-slug' };
    const repositories = { datasource: {} as unknown } as unknown;
    getRepositoriesForLoaderMock.mockResolvedValue(
      repositories as never,
    );

    const execute = vi
      .spyOn(GetDatasourceBySlugService.prototype, 'execute')
      .mockResolvedValue(datasource as never);

    const result = await loader(createArgs('ds-slug'));

    expect(result).toEqual({ datasource });
    expect(execute).toHaveBeenCalledWith('ds-slug');
  });
});

