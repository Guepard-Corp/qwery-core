'use client';

import { createContext, useContext, useRef, type ReactNode } from 'react';
import type { NotebookCellType } from '@qwery/agent-factory-sdk';

type NotebookSidebarContextValue = {
  openSidebar: (
    conversationSlug: string,
    options?: {
      messageToSend?: string;
      datasourceId?: string;
      notebookCellType?: NotebookCellType;
      cellId?: number;
    },
  ) => void;
  registerSidebarControl: (control: {
    open: () => void;
    sendMessage?: (text: string) => void;
  }) => void;
  getCellDatasource: () => string | undefined;
  clearCellDatasource: () => void;
  getNotebookCellType: () => NotebookCellType | undefined;
  clearNotebookCellType: () => void;
  getCellId: () => number | undefined;
  clearCellId: () => void;
  registerSqlPasteHandler: (
    handler: (
      sqlQuery: string,
      notebookCellType: NotebookCellType,
      datasourceId: string,
      cellId: number,
    ) => void,
  ) => void;
  unregisterSqlPasteHandler: () => void;
  getSqlPasteHandler: () =>
    | ((
        sqlQuery: string,
        notebookCellType: NotebookCellType,
        datasourceId: string,
        cellId: number,
      ) => void)
    | null;
  registerLoadingStateCallback: (
    callback: (cellId: number | undefined, isProcessing: boolean) => void,
  ) => void;
  unregisterLoadingStateCallback: () => void;
  notifyLoadingStateChange: (
    cellId: number | undefined,
    isProcessing: boolean,
  ) => void;
};

const NotebookSidebarContext =
  createContext<NotebookSidebarContextValue | null>(null);

export function NotebookSidebarProvider({ children }: { children: ReactNode }) {
  const sidebarControlRef = useRef<{
    open: () => void;
    sendMessage?: (text: string) => void;
  } | null>(null);
  const cellDatasourceRef = useRef<string | undefined>(undefined);
  const notebookCellTypeRef = useRef<NotebookCellType | undefined>(undefined);
  const cellIdRef = useRef<number | undefined>(undefined);
  const sqlPasteHandlerRef = useRef<
    | ((
        sqlQuery: string,
        notebookCellType: NotebookCellType,
        datasourceId: string,
        cellId: number,
      ) => void)
    | null
  >(null);
  const loadingStateCallbackRef = useRef<
    ((cellId: number | undefined, isProcessing: boolean) => void) | null
  >(null);

  const openSidebar = (
    conversationSlug: string,
    options?: {
      messageToSend?: string;
      datasourceId?: string;
      notebookCellType?: NotebookCellType;
      cellId?: number;
    },
  ) => {
    // Store datasource if provided - MUST be set before opening sidebar
    if (options?.datasourceId) {
      cellDatasourceRef.current = options.datasourceId;
    }
    // Store notebook cell type if provided
    if (options?.notebookCellType) {
      notebookCellTypeRef.current = options.notebookCellType;
    }
    // Store cellId if provided
    if (options?.cellId !== undefined) {
      cellIdRef.current = options.cellId;
    }

    // Update URL with conversation slug
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('conversation', conversationSlug);
    window.history.replaceState(
      {},
      '',
      currentUrl.pathname + currentUrl.search,
    );

    // Directly open sidebar via control
    sidebarControlRef.current?.open();

    // If a message is provided, send it after ensuring sidebar is ready
    // The datasource is already set above, so AgentUIWrapper will pick it up
    if (options?.messageToSend && sidebarControlRef.current?.sendMessage) {
      const messageToSend = options.messageToSend;
      const datasourceId = options.datasourceId;

      // Use requestAnimationFrame + setTimeout to ensure:
      // 1. Sidebar is fully open and rendered
      // 2. AgentUIWrapper has mounted and can access cellDatasource
      // 3. Datasource is set before message is sent
      // 4. Notebook context (cellType, cellId) is set before message is sent
      requestAnimationFrame(() => {
        setTimeout(() => {
          // Double-check all context values are still set (in case they were cleared)
          if (datasourceId && cellDatasourceRef.current !== datasourceId) {
            cellDatasourceRef.current = datasourceId;
          }
          if (
            options?.notebookCellType &&
            notebookCellTypeRef.current !== options.notebookCellType
          ) {
            notebookCellTypeRef.current = options.notebookCellType;
          }
          if (
            options?.cellId !== undefined &&
            cellIdRef.current !== options.cellId
          ) {
            cellIdRef.current = options.cellId;
          }

          if (messageToSend) {
            sidebarControlRef.current?.sendMessage?.(messageToSend);
          }
        }, 300);
      });
    }
  };

  const getCellDatasource = () => {
    return cellDatasourceRef.current;
  };

  const clearCellDatasource = () => {
    cellDatasourceRef.current = undefined;
  };

  const getNotebookCellType = () => {
    return notebookCellTypeRef.current;
  };

  const clearNotebookCellType = () => {
    notebookCellTypeRef.current = undefined;
  };

  const getCellId = () => {
    return cellIdRef.current;
  };

  const clearCellId = () => {
    cellIdRef.current = undefined;
  };

  const registerSqlPasteHandler = (
    handler: (
      sqlQuery: string,
      notebookCellType: NotebookCellType,
      datasourceId: string,
      cellId: number,
    ) => void,
  ) => {
    sqlPasteHandlerRef.current = handler;
  };

  const unregisterSqlPasteHandler = () => {
    sqlPasteHandlerRef.current = null;
  };

  const getSqlPasteHandler = () => {
    return sqlPasteHandlerRef.current;
  };

  const registerLoadingStateCallback = (
    callback: (cellId: number | undefined, isProcessing: boolean) => void,
  ) => {
    loadingStateCallbackRef.current = callback;
  };

  const unregisterLoadingStateCallback = () => {
    loadingStateCallbackRef.current = null;
  };

  const notifyLoadingStateChange = (
    cellId: number | undefined,
    isProcessing: boolean,
  ) => {
    loadingStateCallbackRef.current?.(cellId, isProcessing);
  };

  const registerSidebarControl = (control: {
    open: () => void;
    sendMessage?: (text: string) => void;
  }) => {
    sidebarControlRef.current = control;
  };

  return (
    <NotebookSidebarContext.Provider
      value={{
        openSidebar,
        registerSidebarControl,
        getCellDatasource,
        clearCellDatasource,
        getNotebookCellType,
        clearNotebookCellType,
        getCellId,
        clearCellId,
        registerSqlPasteHandler,
        unregisterSqlPasteHandler,
        getSqlPasteHandler,
        registerLoadingStateCallback,
        unregisterLoadingStateCallback,
        notifyLoadingStateChange,
      }}
    >
      {children}
    </NotebookSidebarContext.Provider>
  );
}

export function useNotebookSidebar() {
  const context = useContext(NotebookSidebarContext);
  if (!context) {
    // Return no-op functions if not in notebook context
    return {
      openSidebar: () => {},
      registerSidebarControl: () => {},
      getCellDatasource: () => undefined,
      clearCellDatasource: () => {},
      getNotebookCellType: () => undefined,
      clearNotebookCellType: () => {},
      getCellId: () => undefined,
      clearCellId: () => {},
      registerSqlPasteHandler: () => {},
      unregisterSqlPasteHandler: () => {},
      getSqlPasteHandler: () => null,
      registerLoadingStateCallback: () => {},
      unregisterLoadingStateCallback: () => {},
      notifyLoadingStateChange: () => {},
    };
  }
  return context;
}
