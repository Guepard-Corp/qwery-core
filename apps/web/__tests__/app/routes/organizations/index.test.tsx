import type { UseQueryResult } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Organization } from '@qwery/domain/entities';
import { WorkspaceModeEnum, WorkspaceRuntimeEnum } from '@qwery/domain/enums';

import * as WorkspaceContext from '~/lib/context/workspace-context';
import * as UseGetOrganizations from '~/lib/queries/use-get-organizations';

import OrganizationsPage from '../../../../app/routes/organizations/index';

vi.mock('~/lib/context/workspace-context');
vi.mock('~/lib/queries/use-get-organizations');
vi.mock('@qwery/ui/trans', () => ({
  Trans: ({ i18nKey }: { i18nKey: string }) => <span>{i18nKey}</span>,
}));
vi.mock('react-router', () => ({
  useNavigate: vi.fn(() => vi.fn()),
}));

describe('OrganizationsPage', () => {
  const mockRepository = {
    findAll: vi.fn().mockResolvedValue([]),
    findBySlug: vi.fn().mockResolvedValue(null),
    findById: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockResolvedValue(null),
    delete: vi.fn().mockResolvedValue(true),
    shortenId: vi.fn().mockReturnValue(''),
    findByProjectId: vi.fn().mockResolvedValue([]),
    findByTaskId: vi.fn().mockResolvedValue([]),
    findByConversationId: vi.fn().mockResolvedValue([]),
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

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(WorkspaceContext, 'useWorkspace').mockReturnValue({
      repositories: {
        organization: mockRepository,
        user: mockRepository,
        project: mockRepository,
        datasource: mockRepository,
        notebook: mockRepository,
        conversation: mockRepository,
        message: mockRepository,
      },
      workspace: mockWorkspace,
    });
  });

  it('should render skeleton when organizations are loading', () => {
    const mockQueryResult = {
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isPending: true,
      isLoadingError: false,
      isRefetchError: false,
      isSuccess: false,
      status: 'pending' as const,
      dataUpdatedAt: 0,
      errorUpdatedAt: 0,
      errorUpdateCount: 0,
      failureCount: 0,
      failureReason: null,
      fetchStatus: 'fetching' as const,
      isEnabled: true,
      isFetched: false,
      isFetchedAfterMount: false,
      isFetching: true,
      isInitialLoading: true,
      isPaused: false,
      isPlaceholderData: false,
      isRefetching: false,
      isStale: true,
      promise: Promise.resolve([]),
    } satisfies UseQueryResult<Organization[], Error>;

    vi.spyOn(UseGetOrganizations, 'useGetOrganizations').mockReturnValue(
      mockQueryResult,
    );

    render(<OrganizationsPage />);

    // Check if skeleton is rendered using the animate-pulse class
    const skeleton = document.querySelector('.animate-pulse');
    expect(skeleton).toBeTruthy();

    // Verify the organizations list content is not rendered
    expect(
      screen.queryByText('organizations:no_organizations'),
    ).not.toBeInTheDocument();
  });

  it('should render organizations list when data is loaded', () => {
    const mockQueryResult = {
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isPending: false,
      isLoadingError: false,
      isRefetchError: false,
      isSuccess: true,
      status: 'success' as const,
      dataUpdatedAt: Date.now(),
      errorUpdatedAt: 0,
      errorUpdateCount: 0,
      failureCount: 0,
      failureReason: null,
      fetchStatus: 'idle' as const,
      isEnabled: true,
      isFetched: true,
      isFetchedAfterMount: true,
      isFetching: false,
      isInitialLoading: false,
      isPaused: false,
      isPlaceholderData: false,
      isRefetching: false,
      isStale: false,
      promise: Promise.resolve([]),
    } satisfies UseQueryResult<Organization[], Error>;

    vi.spyOn(UseGetOrganizations, 'useGetOrganizations').mockReturnValue(
      mockQueryResult,
    );

    render(<OrganizationsPage />);

    // Verify the skeleton is not rendered
    const skeleton = document.querySelector('.animate-pulse');
    expect(skeleton).toBeFalsy();

    // Verify the organizations list content is rendered (empty state message)
    expect(
      screen.getByText('organizations:no_organizations'),
    ).toBeInTheDocument();
  });
});
