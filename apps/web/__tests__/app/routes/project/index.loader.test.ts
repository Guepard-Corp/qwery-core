import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { Route } from '~/types/app/routes/project/+types/index';

import * as CreateRepositories from '~/lib/loaders/create-repositories';
import { GetProjectBySlugService } from '@qwery/domain/services';
import { clientLoader as loader } from '../../../../app/routes/project/index';

vi.mock('~/lib/loaders/create-repositories');

function createArgs(slug?: string): Route.ClientLoaderArgs {
  return {
    params: { slug: slug ?? '' },
    request: new Request('https://example.test/prj'),
    context: {} as Route.ClientLoaderArgs['context'],
  } as Route.ClientLoaderArgs;
}

describe('project/index loader', () => {
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

  it('returns project when service succeeds', async () => {
    const project = { id: 'prj-1', slug: 'slug-1' };
    const repositories = { project: {} as unknown } as unknown;
    getRepositoriesForLoaderMock.mockResolvedValue(repositories as never);

    const execute = vi
      .spyOn(GetProjectBySlugService.prototype, 'execute')
      .mockResolvedValue(project as never);

    const result = await loader(createArgs('slug-1'));

    expect(result).toEqual({ project });
    expect(execute).toHaveBeenCalledWith('slug-1');
  });
});
