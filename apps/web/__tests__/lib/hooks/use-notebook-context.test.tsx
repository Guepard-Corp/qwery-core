import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useNotebookContext } from '~/lib/hooks/use-notebook-context';

vi.mock('@qwery/agent-factory-sdk', () => ({
  NOTEBOOK_CELL_TYPE: { QUERY: 'query', PROMPT: 'prompt' },
}));

const getCellId = vi.fn();
const getNotebookCellType = vi.fn();
const getCellDatasource = vi.fn();
const notifyLoadingStateChange = vi.fn();

vi.mock('~/lib/context/notebook-sidebar-context', () => ({
  useNotebookSidebar: () => ({
    getCellId,
    getNotebookCellType,
    getCellDatasource,
    notifyLoadingStateChange,
  }),
}));

vi.mock('@qwery/ui/ai', () => ({
  useAgentStatus: () => ({ isProcessing: false }),
}));

describe('useNotebookContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCellId.mockReturnValue(undefined);
    getNotebookCellType.mockReturnValue(undefined);
    getCellDatasource.mockReturnValue(undefined);
  });

  it('returns context with cellId, notebookCellType and datasourceId when sidebar provides them', async () => {
    getCellId.mockReturnValue(1);
    getNotebookCellType.mockReturnValue('query');
    getCellDatasource.mockReturnValue('ds-1');

    const { result } = renderHook(() => useNotebookContext());

    await waitFor(() => {
      expect(result.current[0]).toEqual({
        cellId: 1,
        notebookCellType: 'query',
        datasourceId: 'ds-1',
      });
    });
  });

  it('defaults notebookCellType to prompt when getNotebookCellType returns falsy', async () => {
    getCellId.mockReturnValue(2);
    getNotebookCellType.mockReturnValue(undefined);
    getCellDatasource.mockReturnValue('ds-2');

    const { result } = renderHook(() => useNotebookContext());

    await waitFor(() => {
      expect(result.current[0]).toEqual({
        cellId: 2,
        notebookCellType: 'prompt',
        datasourceId: 'ds-2',
      });
    });
  });

  it('returns undefined context when cellId is undefined and no datasource', () => {
    getCellId.mockReturnValue(undefined);
    getCellDatasource.mockReturnValue(undefined);

    const { result } = renderHook(() => useNotebookContext());

    expect(result.current[0]).toBeUndefined();
  });

  it('calls notifyLoadingStateChange with cellId and isProcessing', async () => {
    getCellId.mockReturnValue(3);
    getCellDatasource.mockReturnValue('ds-3');

    renderHook(() => useNotebookContext());

    await waitFor(() => {
      expect(notifyLoadingStateChange).toHaveBeenCalledWith(3, false);
    });
  });
});
