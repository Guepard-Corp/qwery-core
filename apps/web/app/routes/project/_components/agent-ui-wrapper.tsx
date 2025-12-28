'use client';

import {
  useMemo,
  useImperativeHandle,
  forwardRef,
  useRef,
  useState,
  useCallback,
  useEffect,
} from 'react';
import QweryAgentUI from '@qwery/ui/agent-ui';
import {
  SUPPORTED_MODELS,
  transportFactory,
  type UIMessage,
} from '@qwery/agent-factory-sdk';
import { MessageOutput, UsageOutput } from '@qwery/domain/usecases';
import { convertMessages } from '~/lib/utils/messages-converter';
import { useWorkspace } from '~/lib/context/workspace-context';
import { getUsageKey, useGetUsage } from '~/lib/queries/use-get-usage';
import { QweryContextProps } from 'node_modules/@qwery/ui/src/qwery/ai/context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getAllExtensionMetadata } from '@qwery/extensions-loader';
import { useGetDatasourcesByProjectId } from '~/lib/queries/use-get-datasources';
import type { DatasourceItem } from '@qwery/ui/ai';
import { useGetConversationBySlug } from '~/lib/queries/use-get-conversations';
import { useUpdateConversation } from '~/lib/mutations/use-conversation';
import { useNotebookSidebar } from '~/lib/context/notebook-sidebar-context';
import { PROMPT_SOURCE, NOTEBOOK_CELL_TYPE } from '@qwery/agent-factory-sdk';
import { useAgentStatus } from '@qwery/ui/ai';

type SendMessageFn = (
  message: { text: string },
  options?: { body?: Record<string, unknown> },
) => Promise<void> & {
  setMessages?: (
    messages: UIMessage[] | ((prev: UIMessage[]) => UIMessage[]),
  ) => void;
};

export interface AgentUIWrapperRef {
  sendMessage: (text: string) => void | Promise<void>;
}

export interface SidebarControl {
  open: () => void;
  sendMessage?: (text: string) => void;
}

export interface AgentUIWrapperProps {
  conversationSlug: string;
  initialMessages?: MessageOutput[];
  isMessagesLoading?: boolean;
}

const convertUsage = (usage: UsageOutput[] | undefined): QweryContextProps => {
  if (!usage || usage.length === 0) {
    return {
      usedTokens: 0,
      maxTokens: 0,
    };
  }

  const aggregated = usage.reduce(
    (acc, curr) => ({
      inputTokens: acc.inputTokens + curr.inputTokens,
      outputTokens: acc.outputTokens + curr.outputTokens,
      totalTokens: acc.totalTokens + curr.totalTokens,
      reasoningTokens: acc.reasoningTokens + curr.reasoningTokens,
      cachedInputTokens: acc.cachedInputTokens + curr.cachedInputTokens,
      maxContextSize: Math.max(acc.maxContextSize, curr.contextSize),
      modelId: curr.model,
    }),
    {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      reasoningTokens: 0,
      cachedInputTokens: 0,
      maxContextSize: 128_000,
      modelId: '',
    },
  );

  return {
    usedTokens: aggregated.totalTokens,
    maxTokens: aggregated.maxContextSize,
    modelId: aggregated.modelId || undefined,
    usage: {
      inputTokens: aggregated.inputTokens,
      outputTokens: aggregated.outputTokens,
      totalTokens: aggregated.totalTokens,
      reasoningTokens: aggregated.reasoningTokens,
      cachedInputTokens: aggregated.cachedInputTokens,
    },
  };
};

export const AgentUIWrapper = forwardRef<
  AgentUIWrapperRef,
  AgentUIWrapperProps
>(function AgentUIWrapper(
  { conversationSlug, initialMessages, isMessagesLoading = false },
  ref,
) {
  const sendMessageRef = useRef<((text: string) => Promise<void>) | null>(null);
  const internalSendMessageRef = useRef<SendMessageFn | null>(null);
  const setMessagesRef = useRef<
    | ((messages: UIMessage[] | ((prev: UIMessage[]) => UIMessage[])) => void)
    | null
  >(null);
  const currentModelRef = useRef<string>(
    SUPPORTED_MODELS[0]?.value || 'local-llm/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf',
  );
  const queryClient = useQueryClient();
  const { repositories, workspace } = useWorkspace();
  const { data: usage } = useGetUsage(
    repositories.usage,
    repositories.conversation,
    conversationSlug,
    workspace.userId,
  );
  const {
    getCellDatasource,
    clearCellDatasource,
    getNotebookCellType,
    getCellId,
    getSqlPasteHandler,
    notifyLoadingStateChange,
  } = useNotebookSidebar();

  
  const { isProcessing } = useAgentStatus();

 
  const { data: conversation, isLoading: isConversationLoading } =
    useGetConversationBySlug(repositories.conversation, conversationSlug);

 
  const cellDatasource = getCellDatasource();

 
  const conversationDatasources = useMemo(
    () => conversation?.datasources || [],
    [conversation?.datasources],
  );

  
  const [pendingDatasources, setPendingDatasources] = useState<string[] | null>(
    null,
  );


  const [notebookContextState, setNotebookContextState] = useState<
    | {
      cellId: number;
      notebookCellType: 'query' | 'prompt';
      datasourceId: string;
    }
    | undefined
  >(undefined);

 
  const initializedCellDatasourceRef = useRef<string | null>(null);

  
  const updateConversation = useUpdateConversation(repositories.conversation);

 
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
          updatedBy: workspace.username || workspace.userId || 'system',
        },
        {
          onSuccess: () => {
            
            setPendingDatasources([cellDatasource]);
          },
        },
      );
    } else if (cellDatasource && !conversation?.id) {
      
      requestAnimationFrame(() => {
        setPendingDatasources([cellDatasource]);
      });
    }

    // Reset initialization tracking when cellDatasource is cleared
    if (!cellDatasource) {
      initializedCellDatasourceRef.current = null;
    }
  }, [
    cellDatasource,
    conversation?.id,
 
    conversationDatasources,
    updateConversation,
    workspace.username,
    workspace.userId,
  ]);

 
  const selectedDatasources = useMemo(() => {
    
    if (cellDatasource) {
      return [cellDatasource];
    }
   
    return pendingDatasources !== null
      ? pendingDatasources
      : conversationDatasources;
  }, [cellDatasource, pendingDatasources, conversationDatasources]);

 
  const datasources = useGetDatasourcesByProjectId(
    repositories.datasource,
    workspace.projectId || '',
    { enabled: !!workspace.projectId },
  );

  
  const { data: pluginMetadata = [] } = useQuery({
    queryKey: ['all-plugin-metadata'],
    queryFn: () => getAllExtensionMetadata(),
    staleTime: 60 * 1000,
  });

  const pluginLogoMap = useMemo(() => {
    const map = new Map<string, string>();
    pluginMetadata.forEach((plugin) => {
      if (plugin?.id && plugin.logo) {
        map.set(plugin.id, plugin.logo);
      }
    });
    return map;
  }, [pluginMetadata]);


  const datasourceItems = useMemo<DatasourceItem[]>(() => {
    if (!datasources.data) return [];
    return datasources.data.map((ds) => ({
      id: ds.id,
      name: ds.name,
      slug: ds.slug,
      datasource_provider: ds.datasource_provider,
    }));
  }, [datasources.data]);

  const transport = useMemo(
    () => (model: string) => {
      return transportFactory(conversationSlug, model, repositories);
    },
    [conversationSlug, repositories],
  );

  
  const handleSendMessageReady = useCallback(
    (sendMessageFn: SendMessageFn, model: string) => {
      internalSendMessageRef.current = sendMessageFn;
      currentModelRef.current = model;

      // Store setMessages if available
      const sendMessageWithSetMessages = sendMessageFn as SendMessageFn & {
        setMessages?: (
          messages: UIMessage[] | ((prev: UIMessage[]) => UIMessage[]),
        ) => void;
      };
      if (sendMessageWithSetMessages.setMessages) {
        setMessagesRef.current = sendMessageWithSetMessages.setMessages;
      }

     
      sendMessageRef.current = async (text: string) => {
        if (internalSendMessageRef.current) {
         
          const currentCellDs = getCellDatasource();
          // Get notebookCellType BEFORE clearing it
          const currentNotebookCellType = getNotebookCellType();
          const currentCellId = getCellId();

          console.log('[AgentUIWrapper] sendMessage called with context:', {
            currentCellDs,
            currentNotebookCellType,
            currentCellId,
            textPreview: text.substring(0, 50),
          });

          // Determine datasources to use - prioritize cellDatasource
          const datasourcesToUse = currentCellDs
            ? [currentCellDs]
            : selectedDatasources && selectedDatasources.length > 0
              ? selectedDatasources
              : undefined;

          // CRITICAL: Update conversation datasources BEFORE sending message
          // The agent uses conversation datasources, not message metadata
          // We must wait for this to complete to ensure the API uses the correct datasource
          if (
            datasourcesToUse &&
            datasourcesToUse.length > 0 &&
            conversation?.id
          ) {
            // Check if datasources need to be updated by comparing IDs
            const currentSorted = [...conversationDatasources].sort();
            const newSorted = [...datasourcesToUse].sort();
            const datasourcesChanged =
              currentSorted.length !== newSorted.length ||
              !currentSorted.every((dsId, index) => dsId === newSorted[index]);

            if (datasourcesChanged) {
              // Update conversation with new datasources - wait for it to complete
              await new Promise<void>((resolve) => {
                updateConversation.mutate(
                  {
                    id: conversation.id,
                    datasources: datasourcesToUse,
                    updatedBy:
                      workspace.username || workspace.userId || 'system',
                  },
                  {
                    onSuccess: () => {
                      // Set pending datasources after successful update
                      setPendingDatasources(datasourcesToUse);
                      resolve();
                    },
                    onError: (error) => {
                      // Even if update fails, set pending datasources for UI
                      setPendingDatasources(datasourcesToUse);
                      console.error(
                        'Failed to update conversation datasources:',
                        error,
                      );
                      // Continue anyway - the datasource in the body will still be used
                      resolve();
                    },
                  },
                );
              });
            } else {
              // Datasources already correct, just set pending for UI
              setPendingDatasources(datasourcesToUse);
            }
          } else if (currentCellDs) {
            // If conversation not loaded yet, just set pending datasources
            setPendingDatasources([currentCellDs]);
          }

          // Build message metadata BEFORE sending - include notebook context if present
          const messageMetadata: Record<string, unknown> = {};
          if (datasourcesToUse && datasourcesToUse.length > 0) {
            messageMetadata.datasources = datasourcesToUse;
          }

          const hasNotebookContext =
            currentCellDs ||
            currentNotebookCellType ||
            currentCellId !== undefined;

          if (hasNotebookContext) {
            messageMetadata.promptSource = PROMPT_SOURCE.INLINE;
            // Always include notebookCellType if we have notebook context
            // Default to 'prompt' if not explicitly set (for paste button visibility)
            messageMetadata.notebookCellType =
              currentNotebookCellType || NOTEBOOK_CELL_TYPE.PROMPT;
            console.log(
              '[AgentUIWrapper] Preparing message with notebook context:',
              {
                promptSource: PROMPT_SOURCE.INLINE,
                notebookCellType: messageMetadata.notebookCellType,
                cellId: currentCellId,
                cellDatasource: currentCellDs,
                textPreview: text.substring(0, 50),
              },
            );

            
            if (currentCellId !== undefined && currentCellDs) {
              setNotebookContextState({
                cellId: currentCellId,
                notebookCellType: (currentNotebookCellType ||
                  NOTEBOOK_CELL_TYPE.PROMPT) as 'query' | 'prompt',
                datasourceId: currentCellDs,
              });
            }
          } else {
            console.log('[AgentUIWrapper] No notebook context detected:', {
              currentCellDs,
              currentNotebookCellType,
              currentCellId,
            });
          }

       
          await internalSendMessageRef.current(
            {
              text,
              ...(Object.keys(messageMetadata).length > 0
                ? { metadata: messageMetadata }
                : {}),
            },
            {
              body: {
                model: currentModelRef.current, 
                datasources: datasourcesToUse, 
              },
            },
          );

        
          if (
            setMessagesRef.current &&
            Object.keys(messageMetadata).length > 0
          ) {
         
            requestAnimationFrame(() => {
              setMessagesRef.current?.((prev: UIMessage[]) => {
              
                const lastUserMessageIndex = prev.findLastIndex(
                  (msg: UIMessage) => msg.role === 'user',
                );
                if (lastUserMessageIndex >= 0) {
                  const lastUserMessage = prev[lastUserMessageIndex];
                  if (!lastUserMessage) {
                    return prev;
                  }
                  // Merge metadata to ensure our notebook context is preserved
                  const updated = [...prev];
                  updated[lastUserMessageIndex] = {
                    ...lastUserMessage,
                    metadata: {
                      ...(lastUserMessage.metadata || {}),
                      ...messageMetadata, // Our metadata takes precedence
                    },
                  };
                  const updatedMessage = updated[lastUserMessageIndex];
                  console.log('[AgentUIWrapper] Updated message metadata:', {
                    messageId: updatedMessage?.id,
                    metadata: updatedMessage?.metadata,
                  });
                  return updated;
                }
                return prev;
              });
            });
          }
        }
      };
    },
    [
      getCellDatasource,
      getNotebookCellType,
      getCellId,
      selectedDatasources,
      conversation,
      conversationDatasources,
      updateConversation,
      workspace.username,
      workspace.userId,
    ],
  );

  useImperativeHandle(
    ref,
    () => ({
      sendMessage: async (text: string) => {
        await sendMessageRef.current?.(text);
      },
    }),
    [],
  );

  const handleEmitFinish = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: getUsageKey(conversationSlug, workspace.userId),
    });
  }, [queryClient, conversationSlug, workspace.userId]);

  // Handle datasource selection change and save to conversation
  const handleDatasourceSelectionChange = useCallback(
    (datasourceIds: string[]) => {
      
      clearCellDatasource();

      // Set pending datasources for immediate UI update
      setPendingDatasources(datasourceIds);

    
      if (conversation?.id) {
        // Check if datasources actually changed
        const currentSorted = [...(conversationDatasources || [])].sort();
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
              onSuccess: () => {
                // Clear pending state after successful mutation
                setPendingDatasources(null);
              },
            },
          );
        } else {
          // Datasources already match, just clear pending
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

 
  const isLoading =
    isMessagesLoading ||
    isConversationLoading ||
    (initialMessages === undefined && !conversation);

  // Update notebook context state when context values are available
  useEffect(() => {
    const cellId = getCellId();
    const notebookCellType = getNotebookCellType();
    const datasourceId = getCellDatasource();

    if (cellId !== undefined && datasourceId) {
      const newContext = {
        cellId,
        notebookCellType: (notebookCellType || NOTEBOOK_CELL_TYPE.PROMPT) as
          | 'query'
          | 'prompt',
        datasourceId,
      };
      requestAnimationFrame(() => {
        setNotebookContextState(newContext);
      });
    } else {
   
      if (cellId === undefined && !datasourceId) {
        const timeoutId = setTimeout(() => {
          setNotebookContextState(undefined);
        }, 30000); // Keep for 30 seconds
        return () => clearTimeout(timeoutId);
      }
    }
  }, [getCellId, getNotebookCellType, getCellDatasource]);

  const notebookContext = notebookContextState;

  // Get paste handler from context
  const pasteHandler = getSqlPasteHandler();

  // Sync loading state with notebook when processing state changes
  useEffect(() => {
    const cellId = getCellId();
    notifyLoadingStateChange(cellId, isProcessing);
  }, [isProcessing, getCellId, notifyLoadingStateChange]);

  return (
    <QweryAgentUI
      transport={transport}
      initialMessages={convertMessages(initialMessages)}
      models={SUPPORTED_MODELS as { name: string; value: string }[]}
      usage={convertUsage(usage)}
      emitFinish={handleEmitFinish}
      datasources={datasourceItems}
      selectedDatasources={selectedDatasources}
      onDatasourceSelectionChange={handleDatasourceSelectionChange}
      pluginLogoMap={pluginLogoMap}
      datasourcesLoading={datasources.isLoading}
      onSendMessageReady={handleSendMessageReady}
      onPasteToNotebook={pasteHandler || undefined}
      notebookContext={notebookContext}
      isLoading={isLoading}
    />
  );
});
