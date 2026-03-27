import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { z } from 'zod';

import { DatasourceConnectForm } from '~/lib/testing/exports/datasource-connect-form';
import { DatasourceKind } from '@qwery/domain/entities';
import { ExtensionScope } from '@qwery/extensions-sdk';

const formRendererSpy = vi.fn();

vi.mock('@qwery/ui/form-renderer', () => ({
  FormRenderer: (props: unknown) => {
    formRendererSpy(props);
    return null;
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string) => k,
    i18n: { resolvedLanguage: 'en', t: (k: string) => k },
  }),
  Trans: () => null,
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('~/lib/context/workspace-context', () => ({
  useWorkspace: () => ({
    repositories: {
      datasource: {},
      project: {},
    },
    workspace: { projectId: 'p1', userId: 'u1' },
  }),
}));

vi.mock('~/lib/mutations/use-create-datasource', () => ({
  useCreateDatasource: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('~/lib/mutations/use-update-datasource', () => ({
  useUpdateDatasource: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('~/lib/mutations/use-delete-datasource', () => ({
  useDeleteDatasource: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('~/lib/mutations/use-test-connection', () => ({
  useTestConnection: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('~/lib/context/datasource-added-flash-context', () => ({
  useDatasourceAddedFlash: () => ({ triggerDatasourceBadge: vi.fn() }),
}));

vi.mock('~/lib/queries/use-get-extension', () => ({
  useGetExtension: () => ({ data: { id: 'some-new-extension', drivers: [] } }),
}));

vi.mock('~/lib/queries/use-extension-schema', () => ({
  useExtensionSchema: () => ({
    data: z.object({
      url: z.string().optional(),
      jsonUrl: z.string().optional(),
    }),
  }),
}));

vi.mock('@qwery/shared/logger', () => ({
  getLogger: async () => ({ error: vi.fn() }),
}));

vi.mock('~/lib/utils/datasource-driver', () => ({
  resolveDriverOrThrow: () => ({ id: 'driver.default', runtime: 'node' }),
}));

describe('DatasourceConnectForm edit defaults', () => {
  it('passes expanded defaults to FormRenderer', () => {
    formRendererSpy.mockClear();

    render(
      <DatasourceConnectForm
        extensionId="some-new-extension"
        projectSlug="proj"
        extensionMeta={{
          id: 'some-new-extension',
          name: 'Some',
          icon: 'some.svg',
          scope: ExtensionScope.DATASOURCE,
          supportsPreview: false,
        }}
        onSuccess={() => {}}
        onCancel={() => {}}
        existingDatasource={{
          id: '11111111-1111-1111-1111-111111111111',
          name: 'DS',
          description: 'desc',
          slug: 'ds',
          projectId: '22222222-2222-2222-2222-222222222222',
          datasource_provider: 'some-new-extension',
          datasource_driver: 'driver.default',
          datasource_kind: DatasourceKind.REMOTE,
          config: { jsonUrl: 'https://example.com/a.json' },
          createdAt: new Date('2020-01-01T00:00:00.000Z'),
          updatedAt: new Date('2020-01-01T00:00:00.000Z'),
          createdBy: '33333333-3333-3333-3333-333333333333',
          updatedBy: '33333333-3333-3333-3333-333333333333',
          isPublic: false,
        }}
      />,
    );

    expect(formRendererSpy).toHaveBeenCalled();
    const props = formRendererSpy.mock.calls[0]?.[0] as {
      defaultValues?: Record<string, unknown>;
    };
    expect(props.defaultValues).toEqual({
      jsonUrl: 'https://example.com/a.json',
      sharedLink: 'https://example.com/a.json',
      url: 'https://example.com/a.json',
    });
  });
});
