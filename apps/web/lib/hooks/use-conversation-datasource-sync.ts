import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { IConversationRepository } from '@qwery/domain/repositories';
import type { Workspace } from '@qwery/domain/entities';
import { useNotebookSidebar } from '~/lib/context/notebook-sidebar-context';
import { useUpdateConversation } from '~/lib/mutations/use-conversation';

interface ConversationWithDatasources {
  id: string;
  datasources: string[];
}

interface UseConversationDatasourceSyncParams {
  conversationRepository: IConversationRepository;
  conversation: ConversationWithDatasources | undefined;
  workspace: Workspace;
}

export function useConversationDatasourceSync({
  conversationRepository,
  conversation,
  workspace,
}: UseConversationDatasourceSyncParams) {
  const { getCellDatasource, clearCellDatasource } = useNotebookSidebar();
  const updateConversation = useUpdateConversation(conversationRepository);
  const cellDatasource = getCellDatasource();

  const conversationDatasources = useMemo(
    () => conversation?.datasources ?? [],
    [conversation?.datasources],
  );

  const [pendingDatasources, setPendingDatasources] = useState<string[] | null>(
    null,
  );
  const initializedCellDatasourceRef = useRef<string | null>(null);
  const selectedDatasourcesRef = useRef<string[]>([]);

  useEffect(() => {
    if (
      cellDatasource &&
      conversation?.id &&
      initializedCellDatasourceRef.current !== cellDatasource &&
      !conversationDatasources.includes(cellDatasource)
    ) {
      initializedCellDatasourceRef.current = cellDatasource;
      updateConversation.mutate(
        {
          id: conversation.id,
          datasources: [cellDatasource],
          updatedBy: workspace.userId,
        },
        {
          onSuccess: () => setPendingDatasources([cellDatasource]),
        },
      );
    } else if (cellDatasource) {
      if (initializedCellDatasourceRef.current !== cellDatasource) {
        initializedCellDatasourceRef.current = cellDatasource;
      }
      const id = requestAnimationFrame(() =>
        setPendingDatasources([cellDatasource]),
      );
      return () => cancelAnimationFrame(id);
    } else {
      initializedCellDatasourceRef.current = null;
    }
  }, [
    cellDatasource,
    conversation?.id,
    conversationDatasources,
    updateConversation,
    workspace.userId,
  ]);

  useEffect(() => {
    const id = setTimeout(() => setPendingDatasources(null), 0);
    return () => clearTimeout(id);
  }, [conversation?.id]);

  const selectedDatasources = useMemo(() => {
    if (cellDatasource) return [cellDatasource];
    return pendingDatasources !== null
      ? pendingDatasources
      : conversationDatasources;
  }, [cellDatasource, pendingDatasources, conversationDatasources]);

  useEffect(() => {
    selectedDatasourcesRef.current = selectedDatasources;
  }, [selectedDatasources]);

  const handleDatasourceSelectionChange = useCallback(
    (datasourceIds: string[]) => {
      clearCellDatasource();
      selectedDatasourcesRef.current = datasourceIds;
      setPendingDatasources(datasourceIds);

      if (conversation?.id) {
        const currentSorted = [...conversationDatasources].sort();
        const newSorted = [...datasourceIds].sort();
        const datasourcesChanged =
          currentSorted.length !== newSorted.length ||
          !currentSorted.every((dsId, index) => dsId === newSorted[index]);

        if (datasourcesChanged) {
          updateConversation.mutate(
            {
              id: conversation.id,
              datasources: datasourceIds,
              updatedBy: workspace.username || workspace.userId || 'system',
            },
            {
              onSuccess: () => setPendingDatasources(null),
            },
          );
        } else {
          setPendingDatasources(null);
        }
      }
    },
    [
      conversation,
      conversationDatasources,
      updateConversation,
      workspace.username,
      workspace.userId,
      clearCellDatasource,
    ],
  );

  return {
    conversationDatasources,
    selectedDatasources,
    setPendingDatasources,
    handleDatasourceSelectionChange,
    selectedDatasourcesRef,
  };
}
