'use client';

import { useCallback } from 'react';
import type { UIMessage } from '@qwery/agent-factory-sdk';
import { NOTEBOOK_CELL_TYPE } from '@qwery/agent-factory-sdk';
import type { NotebookContextValue } from '~/lib/hooks/use-notebook-context';

type SendMessageFn = ((
  message: { text: string },
  options?: { body?: Record<string, unknown> },
) => Promise<void>) & {
  setMessages?: (
    messages: UIMessage[] | ((prev: UIMessage[]) => UIMessage[]),
  ) => void;
};

type UseAgentSendMessageReadyArgs = {
  sendMessageRef: React.MutableRefObject<
    ((text: string) => Promise<void>) | null
  >;
  internalSendMessageRef: React.MutableRefObject<SendMessageFn | null>;
  currentModelRef: React.MutableRefObject<string>;
  setMessagesRef: React.MutableRefObject<
    | ((messages: UIMessage[] | ((prev: UIMessage[]) => UIMessage[])) => void)
    | null
  >;
  sendMessageRafIdRef: React.MutableRefObject<ReturnType<
    typeof requestAnimationFrame
  > | null>;

  getCellDatasource: () => string | undefined;
  getNotebookCellType: () =>
    | NotebookContextValue['notebookCellType']
    | undefined;
  getCellId: () => number | undefined;

  selectedDatasources: string[] | undefined;
  conversation: unknown;
  conversationDatasources: unknown;
  updateConversation: unknown;
  workspaceUsername: string | undefined;
  workspaceUserId: string | undefined;
  setPendingDatasources: (ids: string[]) => void;
  setNotebookContext: React.Dispatch<
    React.SetStateAction<NotebookContextValue | undefined>
  >;
};

/**
 * Bridges the UI-level `sendMessage` function (from `@qwery/ui/agent-ui`) into refs used by
 * `AgentUIWrapperRef.sendMessage`, while attaching best-effort context (selected datasources + notebook context).
 */
export function useAgentSendMessageReady({
  sendMessageRef,
  internalSendMessageRef,
  currentModelRef,
  setMessagesRef,
  sendMessageRafIdRef,
  getCellDatasource,
  getNotebookCellType,
  getCellId,
  selectedDatasources,
  workspaceUsername,
  workspaceUserId,
  setPendingDatasources,
  setNotebookContext,
}: UseAgentSendMessageReadyArgs) {
  return useCallback(
    (sendMessage: SendMessageFn, model: string) => {
      internalSendMessageRef.current = sendMessage;
      currentModelRef.current = model;
      setMessagesRef.current = sendMessage.setMessages ?? null;

      sendMessageRef.current = async (text: string) => {
        const datasourceIds =
          selectedDatasources && selectedDatasources.length > 0
            ? selectedDatasources
            : [];

        setPendingDatasources(datasourceIds);

        const cellId = getCellId();
        const datasourceId = getCellDatasource();
        const notebookCellType =
          getNotebookCellType() ?? (NOTEBOOK_CELL_TYPE.PROMPT as 'prompt');
        const ctx: NotebookContextValue | undefined =
          cellId !== undefined && datasourceId
            ? { cellId, datasourceId, notebookCellType }
            : undefined;
        setNotebookContext(ctx);

        // Avoid double-sends if UI fires ready multiple times.
        if (sendMessageRafIdRef.current != null) {
          cancelAnimationFrame(sendMessageRafIdRef.current);
        }

        sendMessageRafIdRef.current = requestAnimationFrame(() => {
          void sendMessage(
            { text },
            {
              body: {
                model,
                datasourceIds,
                notebookContext: ctx,
                workspaceUsername,
                workspaceUserId,
              },
            },
          );
        });
      };
    },
    [
      internalSendMessageRef,
      currentModelRef,
      setMessagesRef,
      sendMessageRef,
      sendMessageRafIdRef,
      getCellDatasource,
      getNotebookCellType,
      getCellId,
      selectedDatasources,
      workspaceUsername,
      workspaceUserId,
      setPendingDatasources,
      setNotebookContext,
    ],
  );
}
