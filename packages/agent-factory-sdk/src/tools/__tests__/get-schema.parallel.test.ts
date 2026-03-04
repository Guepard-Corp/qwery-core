import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetSchemaTool } from '../get-schema';
import {
  ExtensionsRegistry,
  type DatasourceExtension,
} from '@qwery/extensions-sdk';
import * as driverLoader from '@qwery/extensions-loader';
import type { DatasourceMetadata } from '@qwery/domain/entities';

vi.mock('@qwery/shared/logger', () => ({
  getLogger: vi.fn().mockResolvedValue({
    debug: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock('@qwery/extensions-loader', () => ({
  getDriverInstance: vi.fn(),
}));

type MockDatasource = {
  id: string;
  name: string;
  datasource_provider: string;
  config: { key: string };
};

type MockFindByIdFn = ReturnType<typeof vi.fn> &
  ((id: string) => Promise<MockDatasource | null>);

type MockRepositories = {
  datasource: {
    findById: MockFindByIdFn;
  };
};

type MockToolContext = {
  extra: {
    repositories: MockRepositories;
    attachedDatasources: string[];
  };
};

describe('GetSchemaTool - Parallelism Verification', () => {
  let mockRepositories: MockRepositories;
  let mockContext: MockToolContext;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRepositories = {
      datasource: {
        findById: vi.fn() as MockFindByIdFn,
      },
    };

    mockContext = {
      extra: {
        repositories: mockRepositories,
        attachedDatasources: ['ds1', 'ds2'],
      },
    };

    // Register a mock provider
    const mockExtension: Partial<DatasourceExtension> = {
      drivers: [{ runtime: 'node' } as DatasourceExtension['drivers'][number]],
    };

    vi.spyOn(ExtensionsRegistry, 'get').mockReturnValue(
      mockExtension as DatasourceExtension,
    );
  });

  it('should fetch schemas in parallel', async () => {
    const ds1 = {
      id: 'ds1',
      name: 'DS 1',
      datasource_provider: 'mock',
      config: { key: 'ds1' },
    };
    const ds2 = {
      id: 'ds2',
      name: 'DS 2',
      datasource_provider: 'mock',
      config: { key: 'ds2' },
    };

    mockRepositories.datasource.findById.mockImplementation((id: string) => {
      if (id === 'ds1') return Promise.resolve(ds1);
      if (id === 'ds2') return Promise.resolve(ds2);
      return Promise.resolve(null);
    });

    const mockInstance1 = {
      metadata: vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        return {
          tables: [{ id: 1, name: 'table1', schema: 'public' }],
          columns: [],
          schemas: [],
        };
      }),
      close: vi.fn(),
    };

    const mockInstance2 = {
      metadata: vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        return {
          tables: [{ id: 1, name: 'table2', schema: 'public' }],
          columns: [],
          schemas: [],
        };
      }),
      close: vi.fn(),
    };

    const mockedGetDriverInstance =
      driverLoader.getDriverInstance as unknown as {
        mockImplementation: (
          impl: (
            driver: Parameters<typeof driverLoader.getDriverInstance>[0],
            context: Parameters<typeof driverLoader.getDriverInstance>[1],
          ) => Promise<unknown>,
        ) => unknown;
      };

    mockedGetDriverInstance.mockImplementation(
      async (
        _driver: Parameters<typeof driverLoader.getDriverInstance>[0],
        context: Parameters<typeof driverLoader.getDriverInstance>[1],
      ) => {
        const key = (context.config as { key?: string | undefined } | undefined)
          ?.key;
        if (key === 'ds1') return mockInstance1;
        if (key === 'ds2') return mockInstance2;
        return null;
      },
    );

    const startTime = Date.now();
    const result = (await (
      GetSchemaTool as unknown as {
        execute: (
          params: unknown,
          ctx: MockToolContext,
        ) => Promise<{
          schema: DatasourceMetadata;
        }>;
      }
    ).execute({}, mockContext)) as { schema: DatasourceMetadata };
    const endTime = Date.now();

    const duration = endTime - startTime;

    // Parallel should take ~500ms. If sequential, it would be ~1000ms.
    // 800ms threshold ensures it's parallel.
    expect(duration).toBeLessThan(800);

    expect(result.schema.tables).toHaveLength(2);
    expect(mockInstance1.metadata).toHaveBeenCalled();
    expect(mockInstance2.metadata).toHaveBeenCalled();
  });
});
