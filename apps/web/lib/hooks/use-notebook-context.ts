import { useState, useEffect } from 'react';
import { NOTEBOOK_CELL_TYPE } from '@qwery/agent-factory-sdk';
import { useNotebookSidebar } from '~/lib/context/notebook-sidebar-context';
import { useAgentStatus } from '@qwery/ui/ai';

export interface NotebookContextValue {
  cellId: number;
  notebookCellType: 'query' | 'prompt';
  datasourceId: string;
}

export function useNotebookContext() {
  const {
    getCellId,
    getNotebookCellType,
    getCellDatasource,
    notifyLoadingStateChange,
  } = useNotebookSidebar();
  const { isProcessing } = useAgentStatus();
  const [notebookContext, setNotebookContext] = useState<
    NotebookContextValue | undefined
  >(undefined);

  useEffect(() => {
    const cellId = getCellId();
    const notebookCellType = getNotebookCellType();
    const datasourceId = getCellDatasource();

    if (cellId !== undefined && datasourceId) {
      const newContext: NotebookContextValue = {
        cellId,
        notebookCellType: (notebookCellType || NOTEBOOK_CELL_TYPE.PROMPT) as
          | 'query'
          | 'prompt',
        datasourceId,
      };
      const id = requestAnimationFrame(() => setNotebookContext(newContext));
      return () => cancelAnimationFrame(id);
    }

    if (cellId === undefined && !datasourceId) {
      const timeoutId = setTimeout(() => setNotebookContext(undefined), 30000);
      return () => clearTimeout(timeoutId);
    }
  }, [getCellId, getNotebookCellType, getCellDatasource]);

  useEffect(() => {
    const cellId = getCellId();
    notifyLoadingStateChange(cellId, isProcessing);
  }, [isProcessing, getCellId, notifyLoadingStateChange]);

  return [notebookContext, setNotebookContext] as const;
}
