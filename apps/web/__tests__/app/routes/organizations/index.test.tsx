import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WorkspaceModeEnum, WorkspaceRuntimeEnum } from '@qwery/domain/enums';

import type { Route } from '~/types/app/routes/organizations/+types/index';
import * as WorkspaceContext from '~/lib/context/workspace-context';

import OrganizationsPage from '../../../../app/routes/organizations/index';

vi.mock('~/lib/context/workspace-context');
vi.mock('~/lib/mutations/use-organization', () => ({
  useCreateOrganization: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useUpdateOrganization: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useDeleteOrganization: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

vi.mock('@qwery/ui/trans', () => ({
  Trans: ({ i18nKey }: { i18nKey: string }) => <span>{i18nKey}</span>,
}));
vi.mock('react-router', () => ({
  useNavigate: vi.fn(() => vi.fn()),
}));

const mockRepository = {
  findAll: vi.fn().mockResolvedValue([]),
  findAllByOrganizationId: vi.fn().mockResolvedValue([]),
  search: vi.fn().mockResolvedValue([]),
  findBySlug: vi.fn().mockResolvedValue(null),
  findById: vi.fn().mockResolvedValue(null),
  create: vi.fn().mockResolvedValue(null),
  update: vi.fn().mockResolvedValue(null),
  delete: vi.fn().mockResolvedValue(true),
  shortenId: vi.fn().mockReturnValue(''),
  findByProjectId: vi.fn().mockResolvedValue([]),
  findByTaskId: vi.fn().mockResolvedValue([]),
  findByConversationId: vi.fn().mockResolvedValue([]),
  findByConversationSlug: vi.fn().mockResolvedValue([]),
  findByConversationIdPaginated: vi.fn().mockResolvedValue({
    messages: [],
    nextCursor: null,
    hasMore: false,
  }),
  revealSecrets: vi.fn((config: unknown) =>
    Promise.resolve(config as Record<string, unknown>),
  ),
  upsertByConversationId: vi.fn().mockResolvedValue([]),
};

const mockWorkspace = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  userId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
  username: 'testuser',
  organizationId: undefined,
  projectId: undefined,
  isAnonymous: false,
  mode: WorkspaceModeEnum.SIMPLE,
  runtime: WorkspaceRuntimeEnum.BROWSER,
};

function renderWithProviders(ui: ReactElement) {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe('OrganizationsPage', () => {
  beforeEach(() => {
    vi.spyOn(WorkspaceContext, 'useWorkspace').mockReturnValue({
      repositories: {
        organization: mockRepository,
        user: mockRepository,
        project: mockRepository,
        datasource: mockRepository,
        notebook: mockRepository,
        conversation: mockRepository,
        message: mockRepository,
        usage: mockRepository,
        todo: mockRepository,
      },
      workspace: mockWorkspace,
    });
  });

  it('should render organizations list from loader data', () => {
    const props = {
      loaderData: { organizations: [] },
      params: {},
    } as unknown as Route.ComponentProps;
    renderWithProviders(<OrganizationsPage {...props} />);

    expect(
      screen.getByText('organizations:no_organizations'),
    ).toBeInTheDocument();
  });
});
