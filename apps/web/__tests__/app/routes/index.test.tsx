import type { ReactElement, ReactNode } from 'react';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { WorkspaceModeEnum, WorkspaceRuntimeEnum } from '@qwery/domain/enums';

import IndexPage from '../../../app/routes/index';
import * as WorkspaceContext from '~/lib/context/workspace-context';

const navigateMock = vi.fn();

vi.mock('react-router', () => ({
  useNavigate: () => navigateMock,
  Link: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('~/lib/context/workspace-context');

const mockWorkspace = {
  id: 'workspace-1',
  userId: 'user-1',
  username: 'test-user',
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

describe('IndexPage recent project redirect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigateMock.mockReset();
    localStorage.clear();

    vi.spyOn(WorkspaceContext, 'useWorkspace').mockReturnValue({
      repositories: {} as never,
      workspace: mockWorkspace,
    });
  });

  it('does not redirect when there is no stored project slug', () => {
    renderWithProviders(<IndexPage />);

    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('does not redirect when last use is older than 1 hour', () => {
    const oldTimestamp = Date.now() - 2 * 60 * 60 * 1000;
    localStorage.setItem('qwery:last-project-slug', 'old-slug');
    localStorage.setItem('qwery:last-project-used-at', String(oldTimestamp));

    renderWithProviders(<IndexPage />);

    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('redirects to last project when used within the last hour', () => {
    const recentTimestamp = Date.now() - 10 * 60 * 1000;
    localStorage.setItem('qwery:last-project-slug', 'recent-slug');
    localStorage.setItem('qwery:last-project-used-at', String(recentTimestamp));

    renderWithProviders(<IndexPage />);

    expect(navigateMock).toHaveBeenCalledWith('/prj/recent-slug', {
      replace: true,
    });
  });
});
