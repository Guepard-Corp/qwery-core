import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { Route } from '~/types/app/routes/organization/+types/index';
import {
  GetOrganizationBySlugService,
  GetProjectsByOrganizationIdService,
} from '@qwery/domain/services';

import * as CreateRepositories from '~/lib/loaders/create-repositories';
import { clientLoader as loader } from '../../../../app/routes/organization/index';

vi.mock('~/lib/loaders/create-repositories');

function createArgs(slug?: string): Route.ClientLoaderArgs {
  return {
    params: { slug: slug ?? '' },
    request: new Request('https://example.test/org'),
    context: {} as Route.ClientLoaderArgs['context'],
  } as Route.ClientLoaderArgs;
}

describe('organization/index loader', () => {
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

  it('returns organization and projects when services succeed', async () => {
    const organization = { id: 'org-1', slug: 'org-slug' };
    const projects = [{ id: 'prj-1', name: 'Project 1' }];

    const repositories = {
      organization: {} as unknown,
      project: {} as unknown,
    } as unknown;

    getRepositoriesForLoaderMock.mockResolvedValue(repositories as never);

    const getOrgExecute = vi
      .spyOn(GetOrganizationBySlugService.prototype, 'execute')
      .mockResolvedValue(organization as never);

    const getProjectsExecute = vi
      .spyOn(GetProjectsByOrganizationIdService.prototype, 'execute')
      .mockResolvedValue(projects as never);

    const result = await loader(createArgs('org-slug'));

    expect(result).toEqual({
      organization,
      projects,
    });
    expect(getOrgExecute).toHaveBeenCalledWith('org-slug');
    expect(getProjectsExecute).toHaveBeenCalledWith('org-1');
  });
});
