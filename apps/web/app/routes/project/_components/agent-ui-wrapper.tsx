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
  getDefaultModel,
} from '@qwery/agent-factory-sdk';
import { MessageOutput, UsageOutput } from '@qwery/domain/usecases';
import { convertMessages } from '~/lib/utils/messages-converter';
import { useProjectOptional } from '~/lib/context/project-context';
import { useWorkspace } from '~/lib/context/workspace-context';
import { getUsageKey, useGetUsage } from '~/lib/queries/use-get-usage';
import type { QweryContextProps } from '@qwery/ui/ai';
import { useQueryClient } from '@tanstack/react-query';
import { useGetDatasourcesByProjectId } from '~/lib/queries/use-get-datasources';
import { useGetDatasourceExtensions } from '~/lib/queries/use-get-extension';
import type { DatasourceItem } from '@qwery/ui/ai';
import { useGetConversationBySlug } from '~/lib/queries/use-get-conversations';
import { useUpdateConversation } from '~/lib/mutations/use-conversation';
import { useSubmitFeedback } from '~/lib/mutations/use-submit-feedback';
import { useNotebookSidebar } from '~/lib/context/notebook-sidebar-context';
import { PROMPT_SOURCE, NOTEBOOK_CELL_TYPE } from '@qwery/agent-factory-sdk';
import { useAgentStatus } from '@qwery/ui/ai';
import type { FeedbackPayload } from '@qwery/ui/ai';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

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
      cost: acc.cost + (curr.cost ?? 0),
      maxContextSize: Math.max(acc.maxContextSize, curr.contextSize),
      modelId: curr.model,
    }),
    {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      reasoningTokens: 0,
      cachedInputTokens: 0,
      cost: 0,
      maxContextSize: 128_000,
      modelId: '',
    },
  );

  const usageObj: NonNullable<QweryContextProps['usage']> = {
    inputTokens: aggregated.inputTokens,
    outputTokens: aggregated.outputTokens,
    totalTokens: aggregated.totalTokens,
    reasoningTokens: aggregated.reasoningTokens,
    cachedInputTokens: aggregated.cachedInputTokens,
    inputTokenDetails: {
      noCacheTokens: Math.max(
        0,
        aggregated.inputTokens - aggregated.cachedInputTokens,
      ),
      cacheReadTokens: aggregated.cachedInputTokens,
      cacheWriteTokens: undefined,
    },
    outputTokenDetails: {
      textTokens: Math.max(
        0,
        aggregated.outputTokens - aggregated.reasoningTokens,
      ),
      reasoningTokens: aggregated.reasoningTokens,
    },
  };
  return {
    usedTokens: aggregated.totalTokens,
    maxTokens: aggregated.maxContextSize,
    modelId: aggregated.modelId || undefined,
    usage: { ...usageObj, cost: aggregated.cost } as NonNullable<
      QweryContextProps['usage']
    >,
  };
};

export const AgentUIWrapper = forwardRef<
  AgentUIWrapperRef,
  AgentUIWrapperProps
>(function AgentUIWrapper(
  { conversationSlug, initialMessages, isMessagesLoading = false },
  ref,
) {
  const { t } = useTranslation('common');
  const sendMessageRef = useRef<((text: string) => Promise<void>) | null>(null);
  const internalSendMessageRef = useRef<SendMessageFn | null>(null);
  const setMessagesRef = useRef<
    | ((messages: UIMessage[] | ((prev: UIMessage[]) => UIMessage[])) => void)
    | null
  >(null);
  const currentModelRef = useRef<string>(
    SUPPORTED_MODELS[0]?.value ?? getDefaultModel(),
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

  // Track agent processing state for notebook loading sync
  const { isProcessing } = useAgentStatus();

  // Load current conversation to get existing datasources
  const { data: conversation, isLoading: isConversationLoading } =
    useGetConversationBySlug(repositories.conversation, conversationSlug);

  // Get cell datasource from notebook context (if opened from a cell)
  const cellDatasource = getCellDatasource();

  // Derive selected datasources from conversation
  const conversationDatasources = useMemo(
    () => conversation?.datasources || [],
    [conversation?.datasources],
  );

  // Track pending user changes (cleared after successful mutation)
  const [pendingDatasources, setPendingDatasources] = useState<string[] | null>(
    null,
  );

  // Track notebook context state for paste functionality
  const [notebookContextState, setNotebookContextState] = useState<
    | {
        cellId: number;
        notebookCellType: 'query' | 'prompt';
        datasourceId: string;
      }
    | undefined
  >(undefined);

  // Track if we've already initialized datasource from cell to prevent overwriting user selections
  const initializedCellDatasourceRef = useRef<string | null>(null);

  // Mutation to update conversation datasources
  const updateConversation = useUpdateConversation(repositories.conversation);

  // Update conversation when cell datasource is provided (initial setup)
  // This runs once when cellDatasource is first set, before any messages are sent
  // CRITICAL: Only runs once per cellDatasource value to avoid overwriting user selections
  useEffect(() => {
    // Only initialize if:
    // 1. We have a cell datasource
    // 2. We haven't already initialized for this cell datasource
    // 3. Conversation is loaded
    if (
      cellDatasource &&
      conversation?.id &&
      initializedCellDatasourceRef.current !== cellDatasource &&
      !conversationDatasources.includes(cellDatasource)
    ) {
      // Mark as initialized to prevent re-running when conversationDatasources changes
      initializedCellDatasourceRef.current = cellDatasource;

      // Update conversation to include cell datasource immediately
      // This ensures the datasource is set before the message is sent
      updateConversation.mutate(
        {
          id: conversation.id,
          datasources: [cellDatasource],
          updatedBy: workspace.userId,
        },
        {
          onSuccess: () => {
            // Set pending datasources to ensure UI reflects the change immediately
            setPendingDatasources([cellDatasource]);
          },
        },
      );
    } else if (cellDatasource && !conversation?.id) {
      // If conversation not loaded yet, set pending datasources for immediate UI update
      // Use requestAnimationFrame to defer state update outside of effect
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
    // CRITICAL: Only check conversationDatasources for the initial condition check
    // The ref prevents re-running when conversationDatasources changes due to user selection
    conversationDatasources,
    updateConversation,
    workspace.username,
    workspace.userId,
  ]);

  // Priority for display: cellDatasource > pending datasources > conversation datasources
  // This ensures the notebook cell's datasource is shown in the UI immediately
  // cellDatasource is cleared when user manually changes selection or after first message
  const selectedDatasources = useMemo(() => {
    // If cellDatasource is set, show it in the UI (user can still change it)
    if (cellDatasource) {
      return [cellDatasource];
    }
    // Otherwise use pending datasources or conversation datasources
    return pendingDatasources !== null
      ? pendingDatasources
      : conversationDatasources;
  }, [cellDatasource, pendingDatasources, conversationDatasources]);

  const projectContext = useProjectOptional();
  const datasourceProjectId =
    projectContext?.projectId ?? workspace.projectId ?? '';
  const datasources = useGetDatasourcesByProjectId(
    repositories.datasource,
    datasourceProjectId,
    { enabled: !!datasourceProjectId },
  );

  // Fetch extension metadata for datasource icons
  const { data: extensions = [] } = useGetDatasourceExtensions();

  const pluginLogoMap = useMemo(() => {
    const map = new Map<string, string>();
    extensions.forEach((plugin) => {
      if (plugin.icon) {
        map.set(plugin.id, plugin.icon);
      }
    });
    return map;
  }, [extensions]);

  // Convert datasources to DatasourceItem format
  const datasourceItems = useMemo<DatasourceItem[]>(() => {
    if (!datasources.data) return [];
    return datasources.data.map((ds) => ({
      id: ds.id,
      name: ds.name,
      slug: ds.slug,
      datasource_provider: ds.datasource_provider,
      createdAt: ds.createdAt,
      updatedAt: ds.updatedAt,
    }));
  }, [datasources.data]);

  const transport = useMemo(
    () => (model: string) => {
      return transportFactory(conversationSlug, model);
    },
    [conversationSlug],
  );

  // Handle sendMessage and model from QweryAgentUI
  // eslint-disable react-hooks/preserve-manual-memoization -- React Compiler warning about dependency inference
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

      // Create wrapper that uses cellDatasource for initial message, then selectedDatasources
      // This function is stable and doesn't need to be recreated on every datasource change
      sendMessageRef.current = async (text: string) => {
        if (internalSendMessageRef.current) {
          // CRITICAL: ALWAYS check getCellDatasource() directly, not selectedDatasources
          // selectedDatasources might be stale or not updated yet
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
                    updatedBy: workspace.userId,
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

            // Capture notebook context in state when sending message
            // This ensures context is available when tool output arrives
            // Always set context if we have notebook indicators (for paste button visibility)
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

          // Don't clear context immediately - keep it for paste functionality
          // The context will be used when tool output arrives to show paste button
          // Only clear after tool output is received or after a delay
          // Note: We keep cellId, notebookCellType, and datasourceId for paste functionality
          // They will be cleared when the conversation ends or user navigates away

          // Send message with metadata - useChat should preserve metadata if passed in message object
          // We'll also update the message after it's created as a fallback
          await internalSendMessageRef.current(
            {
              text,
              ...(Object.keys(messageMetadata).length > 0
                ? { metadata: messageMetadata }
                : {}),
            },
            {
              body: {
                model: currentModelRef.current, // Use the current model from chat interface
                datasources: datasourcesToUse, // This MUST be the correct datasource(s)
              },
            },
          );

          // Fallback: Update message metadata immediately after sending (in case useChat doesn't preserve it)
          if (
            setMessagesRef.current &&
            Object.keys(messageMetadata).length > 0
          ) {
            // Use requestAnimationFrame to ensure message is added to array first
            requestAnimationFrame(() => {
              setMessagesRef.current?.((prev: UIMessage[]) => {
                // Find the last user message and ensure it has our metadata
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

  const submitFeedback = useSubmitFeedback(conversationSlug, {
    onSuccess: () => toast.success(t('feedback.success')),
    onError: () => toast.error(t('feedback.error')),
  });

  const handleSubmitFeedback = useCallback(
    async (messageId: string, feedback: FeedbackPayload) => {
      await submitFeedback.mutateAsync({ messageId, feedback });
    },
    [submitFeedback],
  );

  const handleEmitFinish = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: getUsageKey(conversationSlug, workspace.userId),
    });
  }, [queryClient, conversationSlug, workspace.userId]);

  // Handle datasource selection change and save to conversation
  const handleDatasourceSelectionChange = useCallback(
    (datasourceIds: string[]) => {
      // Clear cell datasource when user manually changes selection
      // This allows user to override the notebook cell's datasource
      clearCellDatasource();

      // Set pending datasources for immediate UI update
      setPendingDatasources(datasourceIds);

      // Save to conversation if conversation is loaded
      // CRITICAL: Update conversation synchronously to ensure agent uses new datasources
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
              updatedBy: workspace.userId,
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

  // Determine if we're loading - check if messages or conversation are loading
  // initialMessages being undefined means messages haven't loaded yet
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
      // Don't clear immediately - keep it for a bit in case tool output arrives
      // Only clear if all values are gone (user navigated away)
      // Use a timeout to keep context for a reasonable time (30 seconds)
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
      onSubmitFeedback={handleSubmitFeedback}
      notebookContext={notebookContext}
      isLoading={isLoading}
      conversationSlug={conversationSlug}
    />
  );
});
