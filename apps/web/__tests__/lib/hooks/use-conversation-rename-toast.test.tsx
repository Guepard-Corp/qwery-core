import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useConversationRenameToast } from '~/lib/hooks/use-conversation-rename-toast';
import { getConversationKey } from '~/lib/mutations/use-conversation';
import { getConversationsKey } from '~/lib/queries/use-get-conversations';
import { getConversationsByProjectKey } from '~/lib/queries/use-get-conversations-by-project';

const toastSuccess = vi.fn();
vi.mock('sonner', () => ({
  toast: { success: (...args: unknown[]) => toastSuccess(...args) },
}));

const t = vi.fn(
  (key: string, params?: { title?: string }) => params?.title ?? key,
);
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t }),
}));

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe('useConversationRenameToast', () => {
  const projectId = 'project-1';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not show toast or invalidate when conversation stays New Conversation', async () => {
    const queryClient = new QueryClient();
    const invalidateSpy = vi
      .spyOn(queryClient, 'invalidateQueries')
      .mockResolvedValue();

    renderHook(
      () =>
        useConversationRenameToast(
          { slug: 's', title: 'New Conversation' },
          projectId,
        ),
      { wrapper: createWrapper(queryClient) },
    );

    await waitFor(() => {});

    expect(toastSuccess).not.toHaveBeenCalled();
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it('shows toast and invalidates queries when title changes from New Conversation to custom', async () => {
    const queryClient = new QueryClient();
    const invalidateSpy = vi
      .spyOn(queryClient, 'invalidateQueries')
      .mockResolvedValue();

    const { rerender } = renderHook(
      (props: {
        conversation: { slug: string; title: string } | undefined;
        projectId: string;
      }) => useConversationRenameToast(props.conversation, props.projectId),
      {
        wrapper: createWrapper(queryClient),
        initialProps: {
          conversation: { slug: 's', title: 'New Conversation' },
          projectId,
        },
      },
    );

    rerender({
      conversation: { slug: 's', title: 'My Chat' },
      projectId,
    });

    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith('My Chat');
      expect(t).toHaveBeenCalledWith('renamed_success', { title: 'My Chat' });
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: getConversationKey('s'),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: getConversationsKey(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: getConversationsByProjectKey(projectId),
    });
  });
});
