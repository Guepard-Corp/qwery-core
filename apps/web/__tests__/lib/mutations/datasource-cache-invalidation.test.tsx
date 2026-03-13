import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useCreateDatasource } from '~/lib/mutations/use-create-datasource';
import { useDeleteDatasource } from '~/lib/mutations/use-delete-datasource';
import { useUpdateDatasource } from '~/lib/mutations/use-update-datasource';
import {
  getDatasourcesByProjectIdKey,
  getDatasourcesKey,
} from '~/lib/queries/use-get-datasources';
import { datasourceMetadataKeys } from '~/lib/queries/datasource-metadata-keys';

const createExecute = vi.fn();
const updateExecute = vi.fn();
const deleteExecute = vi.fn();

vi.mock('@qwery/domain/services', () => ({
  CreateDatasourceService: class {
    execute = createExecute;
  },
  UpdateDatasourceService: class {
    execute = updateExecute;
  },
  DeleteDatasourceService: class {
    execute = deleteExecute;
  },
}));

const repository = {};

function createWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

function seedMetadataQueries(queryClient: QueryClient, datasourceId: string) {
  queryClient.setQueryData(
    datasourceMetadataKeys.detail(
      'postgresql',
      'postgresql.default',
      datasourceId,
    ),
    { tables: ['fresh-me'] },
  );
  queryClient.setQueryData(
    datasourceMetadataKeys.detail(
      'postgresql',
      'postgresql.default',
      'other-id',
    ),
    { tables: ['keep-me'] },
  );
}

function stubQueryClientInvalidation(queryClient: QueryClient) {
  vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue();
  vi.spyOn(queryClient, 'refetchQueries').mockResolvedValue();
}

describe('datasource metadata cache invalidation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('removes stale metadata cache after create', async () => {
    const queryClient = new QueryClient();
    stubQueryClientInvalidation(queryClient);
    seedMetadataQueries(queryClient, 'ds-1');
    queryClient.setQueryData(getDatasourcesKey(), [{ id: 'stale' }]);
    queryClient.setQueryData(getDatasourcesByProjectIdKey('project-1'), [
      { id: 'stale' },
    ]);

    createExecute.mockResolvedValueOnce({
      id: 'ds-1',
      projectId: 'project-1',
      datasource_provider: 'postgresql',
      datasource_driver: 'postgresql.default',
    });

    const { result } = renderHook(
      () => useCreateDatasource(repository as never, vi.fn(), vi.fn()),
      { wrapper: createWrapper(queryClient) },
    );

    await result.current.mutateAsync({
      projectId: 'project-1',
      name: 'Postgres',
      datasource_provider: 'postgresql',
      datasource_driver: 'postgresql.default',
      datasource_kind: 'remote',
      createdBy: 'user-1',
    });

    await waitFor(() => {
      expect(
        queryClient.getQueryData(
          datasourceMetadataKeys.detail(
            'postgresql',
            'postgresql.default',
            'ds-1',
          ),
        ),
      ).toBeUndefined();
    });

    expect(
      queryClient.getQueryData(
        datasourceMetadataKeys.detail(
          'postgresql',
          'postgresql.default',
          'other-id',
        ),
      ),
    ).toEqual({ tables: ['keep-me'] });
  });

  it('removes stale metadata cache after update', async () => {
    const queryClient = new QueryClient();
    stubQueryClientInvalidation(queryClient);
    seedMetadataQueries(queryClient, 'ds-2');

    updateExecute.mockResolvedValueOnce({
      id: 'ds-2',
      projectId: 'project-1',
      datasource_provider: 'postgresql-neon',
      datasource_driver: 'postgresql.default',
    });

    const { result } = renderHook(
      () => useUpdateDatasource(repository as never, vi.fn(), vi.fn()),
      { wrapper: createWrapper(queryClient) },
    );

    await result.current.mutateAsync({
      id: 'ds-2',
      datasource_driver: 'postgresql.default',
    });

    await waitFor(() => {
      expect(
        queryClient.getQueryData(
          datasourceMetadataKeys.detail(
            'postgresql',
            'postgresql.default',
            'ds-2',
          ),
        ),
      ).toBeUndefined();
    });
  });

  it('removes stale metadata cache after delete', async () => {
    const queryClient = new QueryClient();
    stubQueryClientInvalidation(queryClient);
    seedMetadataQueries(queryClient, 'ds-3');

    deleteExecute.mockResolvedValueOnce(true);

    const { result } = renderHook(
      () => useDeleteDatasource(repository as never, vi.fn(), vi.fn()),
      { wrapper: createWrapper(queryClient) },
    );

    await result.current.mutateAsync({ id: 'ds-3', projectId: 'project-1' });

    await waitFor(() => {
      expect(
        queryClient.getQueryData(
          datasourceMetadataKeys.detail(
            'postgresql',
            'postgresql.default',
            'ds-3',
          ),
        ),
      ).toBeUndefined();
    });
  });
});
