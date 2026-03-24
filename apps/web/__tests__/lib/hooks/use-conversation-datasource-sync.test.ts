import type { IConversationRepository } from '@qwery/domain/repositories';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useConversationDatasourceSync } from '~/lib/hooks/use-conversation-datasource-sync';

const getCellDatasource = vi.fn();
const clearCellDatasource = vi.fn();
const mutate = vi.fn();

vi.mock('~/lib/context/notebook-sidebar-context', () => ({
  useNotebookSidebar: () => ({
    getCellDatasource,
    clearCellDatasource,
  }),
}));

vi.mock('~/lib/mutations/use-conversation', () => ({
  useUpdateConversation: () => ({ mutate }),
}));

const conversationRepository = {} as IConversationRepository;
const workspace = {
  userId: 'user-1',
  username: 'user1',
} as never;

describe('useConversationDatasourceSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCellDatasource.mockReturnValue(undefined);
  });

  it('returns selectedDatasources from conversation.datasources when no cell datasource', () => {
    const conversation = {
      id: 'c1',
      datasources: ['ds-a', 'ds-b'],
    };

    const { result } = renderHook(() =>
      useConversationDatasourceSync({
        conversationRepository,
        conversation,
        workspace,
      }),
    );

    expect(result.current.selectedDatasources).toEqual(['ds-a', 'ds-b']);
    expect(result.current.conversationDatasources).toEqual(['ds-a', 'ds-b']);
  });

  it('calls updateConversation.mutate when cell datasource is not in conversation datasources', async () => {
    getCellDatasource.mockReturnValue('ds-new');
    const conversation = { id: 'c1', datasources: [] };

    renderHook(() =>
      useConversationDatasourceSync({
        conversationRepository,
        conversation,
        workspace,
      }),
    );

    await waitFor(() => {
      expect(mutate).toHaveBeenCalledWith(
        {
          id: 'c1',
          datasources: ['ds-new'],
          updatedBy: 'user-1',
        },
        { onSuccess: expect.any(Function) },
      );
    });
  });

  it('handleDatasourceSelectionChange calls clearCellDatasource and mutate when datasources differ', async () => {
    const conversation = { id: 'c1', datasources: ['ds-old'] };

    const { result } = renderHook(() =>
      useConversationDatasourceSync({
        conversationRepository,
        conversation,
        workspace,
      }),
    );

    result.current.handleDatasourceSelectionChange(['ds-new']);

    expect(clearCellDatasource).toHaveBeenCalled();
    await waitFor(() => {
      expect(mutate).toHaveBeenCalledWith(
        {
          id: 'c1',
          datasources: ['ds-new'],
          updatedBy: 'user1',
        },
        { onSuccess: expect.any(Function) },
      );
    });
  });

  it('handleDatasourceSelectionChange does not call mutate when datasources are unchanged', () => {
    const conversation = { id: 'c1', datasources: ['ds-a'] };

    const { result } = renderHook(() =>
      useConversationDatasourceSync({
        conversationRepository,
        conversation,
        workspace,
      }),
    );

    result.current.handleDatasourceSelectionChange(['ds-a']);

    expect(clearCellDatasource).toHaveBeenCalled();
    expect(mutate).not.toHaveBeenCalled();
  });
});
