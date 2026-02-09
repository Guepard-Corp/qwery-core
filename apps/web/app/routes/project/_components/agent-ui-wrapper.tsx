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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@qwery/ui/alert-dialog';
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
import { useGetUsage } from '~/lib/queries/use-get-usage';
import type { QweryContextProps } from '@qwery/ui/ai';
import { useInvalidateUsage } from '~/lib/hooks/use-invalidate-usage';
import { useGetDatasourcesByProjectId } from '~/lib/queries/use-get-datasources';
import { useGetDatasourceExtensions } from '~/lib/queries/use-get-extension';
import type { DatasourceItem } from '@qwery/ui/ai';
import { useGetConversationBySlug } from '~/lib/queries/use-get-conversations';
import { useUpdateConversation } from '~/lib/mutations/use-conversation';
import { useSubmitFeedback } from '~/lib/mutations/use-submit-feedback';
import { useNotebookSidebar } from '~/lib/context/notebook-sidebar-context';
import { PROMPT_SOURCE, NOTEBOOK_CELL_TYPE } from '@qwery/agent-factory-sdk';
import { useAgentStatus, formatRelativeTime } from '@qwery/ui/ai';
import type { FeedbackPayload } from '@qwery/ui/ai';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { createDatasourceViewPath } from '~/config/project.navigation.config';

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
  initialSuggestions?: string[];
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
  {
    conversationSlug,
    initialMessages,
    isMessagesLoading = false,
    initialSuggestions,
  },
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
  const invalidateUsage = useInvalidateUsage();
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

  const [noDatasourceDialogOpen, setNoDatasourceDialogOpen] = useState(false);
  const [pendingSuggestionText, setPendingSuggestionText] = useState<
    string | null
  >(null);
  const noDatasourceResolveRef = useRef<((value: boolean) => void) | null>(
    null,
  );

  // Mutation to update conversation datasources
  const updateConversation = useUpdateConversation(repositories.conversation);

  // Set pending datasources for immediate UI update when cell datasource changes.
  // The actual conversation update happens atomically in sendMessage to avoid
  // a race condition where concurrent updateConversation.mutate calls cause
  // React Query to swallow the sendMessage's resolve callback (2-click bug).
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
          onSuccess: () => {
            setPendingDatasources([cellDatasource]);
          },
        },
      );
    } else if (cellDatasource) {
      if (initializedCellDatasourceRef.current !== cellDatasource) {
        initializedCellDatasourceRef.current = cellDatasource;
      }
      requestAnimationFrame(() => {
        setPendingDatasources([cellDatasource]);
      });
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

  // Clear pending when conversation changes (e.g. user switched conversation)
  // so we show the new conversation's datasources instead of stale pending
  useEffect(() => {
    setPendingDatasources(null);
  }, [conversation?.id]);

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

          // Determine datasources to use - prioritize cellDatasource
          const datasourcesToUse = currentCellDs
            ? [currentCellDs]
            : selectedDatasources && selectedDatasources.length > 0
              ? selectedDatasources
              : undefined;

          console.log('[AgentUIWrapper] sendMessageRef', {
            currentCellDs,
            selectedDatasources,
            datasourcesToUse,
          });

          // Update conversation datasources BEFORE sending message.
          // Uses mutateAsync so the returned Promise is independent of any
          // concurrent mutate() calls (avoids the 2-click race condition).
          if (
            datasourcesToUse &&
            datasourcesToUse.length > 0 &&
            conversation?.id
          ) {
            const currentSorted = [...conversationDatasources].sort();
            const newSorted = [...datasourcesToUse].sort();
            const datasourcesChanged =
              currentSorted.length !== newSorted.length ||
              !currentSorted.every((dsId, index) => dsId === newSorted[index]);

            if (datasourcesChanged) {
              try {
                await updateConversation.mutateAsync({
                  id: conversation.id,
                  datasources: datasourcesToUse,
                  updatedBy: workspace.username || workspace.userId || 'system',
                });
              } catch (error) {
                console.error(
                  'Failed to update conversation datasources:',
                  error,
                );
              }
              setPendingDatasources(datasourcesToUse);
            } else {
              setPendingDatasources(datasourcesToUse);
            }
          } else if (currentCellDs) {
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
            messageMetadata.notebookCellType =
              currentNotebookCellType || NOTEBOOK_CELL_TYPE.PROMPT;

            if (currentCellId !== undefined && currentCellDs) {
              setNotebookContextState({
                cellId: currentCellId,
                notebookCellType: (currentNotebookCellType ||
                  NOTEBOOK_CELL_TYPE.PROMPT) as 'query' | 'prompt',
                datasourceId: currentCellDs,
              });
            }
          }

          // Don't clear context immediately - keep it for paste functionality
          // The context will be used when tool output arrives to show paste button
          // Only clear after tool output is received or after a delay
          // Note: We keep cellId, notebookCellType, and datasourceId for paste functionality
          // They will be cleared when the conversation ends or user navigates away

          const requestBody = {
            model: currentModelRef.current,
            datasources: datasourcesToUse,
          };
          console.log('[AgentUIWrapper] calling sendMessage with body', requestBody);

          await internalSendMessageRef.current(
            {
              text,
              ...(Object.keys(messageMetadata).length > 0
                ? { metadata: messageMetadata }
                : {}),
            },
            {
              body: requestBody,
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

      // After the server confirms success, sync feedback into useChat's message state.
      // invalidateQueries alone won't work because useChat has its own internal state
      // and the sync effect guards against metadata-only changes (IDs don't change).
      if (setMessagesRef.current) {
        setMessagesRef.current((prevMessages: UIMessage[]) => {
          return prevMessages.map((msg) => {
            if (msg.id === messageId) {
              const currentMetadata = (msg.metadata || {}) as Record<
                string,
                unknown
              >;
              return {
                ...msg,
                metadata: {
                  ...currentMetadata,
                  feedback: {
                    ...feedback,
                    messageId,
                    updatedAt: new Date().toISOString(),
                  },
                },
              };
            }
            return msg;
          });
        });
      }
    },
    [submitFeedback],
  );

  const handleEmitFinish = useCallback(() => {
    invalidateUsage(conversationSlug, workspace.userId);
  }, [invalidateUsage, conversationSlug, workspace.userId]);

  // Handle datasource selection change and save to conversation
  const handleDatasourceSelectionChange = useCallback(
    (datasourceIds: string[]) => {
      console.log('[AgentUIWrapper] handleDatasourceSelectionChange', {
        datasourceIds,
        length: datasourceIds.length,
      });
      clearCellDatasource();

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
          // Datasources already match, clear pending so we use conversation as source of truth
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

  const onBeforeSuggestionSend = useCallback(
    (
      text: string,
      metadata?: { requiresDatasource?: boolean },
    ): Promise<boolean> => {
      console.log('[SuggestionFlow] onBeforeSuggestionSend', {
        text: text?.slice(0, 50),
        metadata,
        selectedCount: selectedDatasources?.length ?? 0,
      });
      if (
        metadata?.requiresDatasource &&
        (!selectedDatasources || selectedDatasources.length === 0)
      ) {
        console.log('[SuggestionFlow] showing no-datasource dialog');
        setPendingSuggestionText(text);
        return new Promise((resolve) => {
          noDatasourceResolveRef.current = resolve;
          setNoDatasourceDialogOpen(true);
        });
      }
      return Promise.resolve(true);
    },
    [selectedDatasources],
  );

  const handleNoDatasourceDialogClose = useCallback((proceed: boolean) => {
    noDatasourceResolveRef.current?.(proceed);
    noDatasourceResolveRef.current = null;
    setPendingSuggestionText(null);
    setNoDatasourceDialogOpen(false);
  }, []);

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

  const getDatasourceTooltip = useCallback(
    (idOrSlug: string) => {
      const ds =
        datasourceItems.find((d) => d.id === idOrSlug) ??
        datasourceItems.find((d) => d.slug === idOrSlug);
      if (!ds) return '';
      const primary = ds.datasource_provider
        ? `${ds.name} (${ds.datasource_provider})`
        : ds.name;
      const date =
        ds.updatedAt instanceof Date
          ? ds.updatedAt
          : ds.createdAt instanceof Date
            ? ds.createdAt
            : ds.updatedAt
              ? new Date(ds.updatedAt)
              : ds.createdAt
                ? new Date(ds.createdAt)
                : null;
      const modified = date ? ` · Modified ${formatRelativeTime(date)}` : '';
      return `${primary}${modified}`;
    },
    [datasourceItems],
  );

  const handleDatasourceNameClick = useCallback(
    (idOrSlug: string, _name: string) => {
      const ds =
        datasourceItems.find((d) => d.id === idOrSlug) ??
        datasourceItems.find((d) => d.slug === idOrSlug);
      if (ds?.slug) {
        const path = createDatasourceViewPath(ds.slug);
        window.open(path, '_blank', 'noopener,noreferrer');
      }
    },
    [datasourceItems],
  );

  const pasteHandler = getSqlPasteHandler();

  // Sync loading state with notebook when processing state changes
  useEffect(() => {
    const cellId = getCellId();
    notifyLoadingStateChange(cellId, isProcessing);
  }, [isProcessing, getCellId, notifyLoadingStateChange]);

  return (
<<<<<<< HEAD
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
=======
    <>
      <QweryAgentUI
        transport={transport}
        initialMessages={convertedInitialMessages}
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
      <AlertDialog
        open={noDatasourceDialogOpen}
        onOpenChange={(open) => {
          if (!open) handleNoDatasourceDialogClose(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>No datasource attached</AlertDialogTitle>
            <AlertDialogDescription>
              You haven&apos;t attached any datasource for this request. The
              agent may not be able to fulfill: &quot;
              {pendingSuggestionText ?? 'this suggestion'}
              &quot;. Do you want to proceed anyway?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleNoDatasourceDialogClose(true)}
            >
              Proceed anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
>>>>>>> d5c40cf6 (feat(agent-ui): no-datasource dialog, initialSuggestions, init fix)
  );
});
