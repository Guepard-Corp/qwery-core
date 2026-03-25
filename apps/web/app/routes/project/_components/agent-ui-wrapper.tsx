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
import { formatRelativeTime } from '@qwery/ui/ai';
import type { FeedbackPayload } from '@qwery/ui/ai';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import {
  createDatasourceViewPath,
  createDatasourceTableViewPath,
} from '~/config/project.navigation.config';
import {
  openDatasourceInNewTab,
  openTableInNewTab,
} from '~/lib/utils/datasource-navigation';
import { useQueryClient } from '@tanstack/react-query';
import { getConversationKey } from '~/lib/mutations/use-conversation';
import { useConversationDatasourceSync } from '~/lib/hooks/use-conversation-datasource-sync';
import { useConversationRenameToast } from '~/lib/hooks/use-conversation-rename-toast';
import { useNotebookContext } from '~/lib/hooks/use-notebook-context';
import { useAgentSendMessageReady } from './use-agent-send-message-ready';

export interface NoDatasourceDialogRef {
  open: (text: string) => Promise<boolean>;
}

const ENABLED_MODELS_STORAGE_KEY = 'qwery-enabled-model-ids';

function loadEnabledModelIds(allModels: { value: string }[]): Set<string> {
  if (typeof window === 'undefined')
    return new Set(allModels.map((m) => m.value));
  try {
    const raw = localStorage.getItem(ENABLED_MODELS_STORAGE_KEY);
    if (!raw) return new Set(allModels.map((m) => m.value));
    const ids = JSON.parse(raw) as string[];
    const valid = new Set(allModels.map((m) => m.value));
    return new Set(ids.filter((id) => valid.has(id)));
  } catch {
    return new Set(allModels.map((m) => m.value));
  }
}

function saveEnabledModelIds(ids: Set<string>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ENABLED_MODELS_STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    /* ignore */
  }
}

const NoDatasourceDialog = forwardRef<NoDatasourceDialogRef>(
  function NoDatasourceDialog(_, ref) {
    const [open, setOpen] = useState(false);
    const [pendingText, setPendingText] = useState<string | null>(null);
    const resolveRef = useRef<((value: boolean) => void) | null>(null);

    useImperativeHandle(
      ref,
      () => ({
        open(text: string) {
          setPendingText(text);
          setOpen(true);
          return new Promise<boolean>((resolve) => {
            resolveRef.current = resolve;
          });
        },
      }),
      [],
    );

    const handleClose = useCallback((proceed: boolean) => {
      resolveRef.current?.(proceed);
      resolveRef.current = null;
      setPendingText(null);
      setOpen(false);
    }, []);

    return (
      <AlertDialog
        open={open}
        onOpenChange={(isOpen) => {
          if (!isOpen) handleClose(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>No datasource attached</AlertDialogTitle>
            <AlertDialogDescription>
              You haven&apos;t attached any datasource for this request. The
              agent may not be able to fulfill: &quot;
              {pendingText ?? 'this suggestion'}
              &quot;. Do you want to proceed anyway?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleClose(true)}>
              Proceed anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  },
);

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
  conversationTitle?: string;
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
    conversationTitle,
    initialMessages,
    isMessagesLoading = false,
    initialSuggestions: _initialSuggestions,
  },
  ref,
) {
  const { t } = useTranslation(['chat', 'common']);
  const queryClient = useQueryClient();
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
    getNotebookCellType,
    getCellId,
    getSqlPasteHandler,
  } = useNotebookSidebar();

  const { data: conversation, isLoading: isConversationLoading } =
    useGetConversationBySlug(repositories.conversation, conversationSlug);

  const interactionCountRef = useRef(0);
  const conversationRefreshTimeoutIdsRef = useRef<
    ReturnType<typeof setTimeout>[]
  >([]);
  const sendMessageRafIdRef = useRef<ReturnType<
    typeof requestAnimationFrame
  > | null>(null);
  const projectContext = useProjectOptional();
  const datasourceProjectId =
    projectContext?.projectId ?? workspace.projectId ?? '';

  useConversationRenameToast(conversation, datasourceProjectId);

  const {
    conversationDatasources,
    selectedDatasources,
    setPendingDatasources,
    handleDatasourceSelectionChange,
    selectedDatasourcesRef,
  } = useConversationDatasourceSync({
    conversationRepository: repositories.conversation,
    conversation,
    workspace,
  });

  const [notebookContext, setNotebookContext] = useNotebookContext();

  const supportedModels = SUPPORTED_MODELS as { name: string; value: string }[];
  const [enabledModelIds, setEnabledModelIds] = useState<Set<string>>(() =>
    loadEnabledModelIds(supportedModels),
  );
  const enabledModels = useMemo(
    () =>
      (SUPPORTED_MODELS as { name: string; value: string }[]).filter((m) =>
        enabledModelIds.has(m.value),
      ),
    [enabledModelIds],
  );

  const handleModelsChange = useCallback(
    (next: { name: string; value: string }[]) => {
      const ids = new Set(next.map((m) => m.value));
      setEnabledModelIds(ids);
      saveEnabledModelIds(ids);
    },
    [],
  );

  const noDatasourceDialogRef = useRef<NoDatasourceDialogRef | null>(null);
  const updateConversation = useUpdateConversation(repositories.conversation);

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

  const convertedInitialMessages = useMemo(
    () => convertMessages(initialMessages),
    [initialMessages],
  );

  const transport = useMemo(
    () => (model: string) => {
      return transportFactory(conversationSlug, model);
    },
    [conversationSlug],
  );

  const handleSendMessageReady = useAgentSendMessageReady({
    sendMessageRef,
    internalSendMessageRef,
    currentModelRef,
    setMessagesRef,
    sendMessageRafIdRef,
    getCellDatasource,
    getNotebookCellType,
    getCellId,
    selectedDatasources,
    conversation,
    conversationDatasources,
    updateConversation,
    workspaceUsername: workspace.username,
    workspaceUserId: workspace.userId,
    setPendingDatasources,
    setNotebookContext,
  });

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

  useEffect(() => {
    return () => {
      conversationRefreshTimeoutIdsRef.current.forEach((id) => {
        clearTimeout(id);
      });
      conversationRefreshTimeoutIdsRef.current = [];

      if (sendMessageRafIdRef.current != null) {
        cancelAnimationFrame(sendMessageRafIdRef.current);
        sendMessageRafIdRef.current = null;
      }
    };
  }, []);

  const scheduleConversationRefresh = useCallback(() => {
    conversationRefreshTimeoutIdsRef.current.forEach((id) => {
      clearTimeout(id);
    });
    conversationRefreshTimeoutIdsRef.current = [];

    const delays = [2000, 4000, 8000];
    delays.forEach((delay) => {
      const id = setTimeout(() => {
        queryClient.invalidateQueries({
          queryKey: getConversationKey(conversationSlug),
        });
      }, delay);
      conversationRefreshTimeoutIdsRef.current.push(id);
    });
  }, [queryClient, conversationSlug]);

  const handleEmitFinish = useCallback(() => {
    invalidateUsage(conversationSlug, workspace.userId);
    interactionCountRef.current += 1;
    const isFirst = interactionCountRef.current === 1;
    const isFifth = interactionCountRef.current === 5;
    if (isFirst || isFifth) {
      scheduleConversationRefresh();
    }
  }, [
    invalidateUsage,
    conversationSlug,
    workspace.userId,
    scheduleConversationRefresh,
  ]);

  const _onBeforeSuggestionSend = useCallback(
    (
      text: string,
      metadata?: { requiresDatasource?: boolean },
    ): Promise<boolean> => {
      if (
        metadata?.requiresDatasource &&
        (!selectedDatasources || selectedDatasources.length === 0)
      ) {
        return (
          noDatasourceDialogRef.current?.open(text) ?? Promise.resolve(false)
        );
      }
      return Promise.resolve(true);
    },
    [selectedDatasources],
  );

  // Determine if we're loading - check if messages or conversation are loading
  // initialMessages being undefined means messages haven't loaded yet
  const isLoading =
    isMessagesLoading ||
    isConversationLoading ||
    (initialMessages === undefined && !conversation);

  const _getDatasourceTooltip = useCallback(
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

  const _handleDatasourceNameClick = useCallback(
    (idOrSlug: string, name: string) => {
      openDatasourceInNewTab(
        datasourceItems,
        idOrSlug,
        name,
        createDatasourceViewPath,
      );
    },
    [datasourceItems],
  );

  const _handleTableNameClick = useCallback(
    (
      datasourceIdOrSlug: string,
      datasourceName: string,
      schema: string,
      tableName: string,
    ) => {
      openTableInNewTab(
        datasourceItems,
        datasourceIdOrSlug,
        datasourceName,
        schema,
        tableName,
        createDatasourceTableViewPath,
      );
    },
    [datasourceItems],
  );

  const pasteHandler = getSqlPasteHandler();

  return (
    <>
      <QweryAgentUI
        transport={transport}
        initialMessages={convertedInitialMessages}
        models={enabledModels}
        allModels={supportedModels}
        onModelsChange={handleModelsChange}
        usage={convertUsage(usage)}
        emitFinish={handleEmitFinish}
        datasources={datasourceItems}
        selectedDatasources={selectedDatasources}
        onDatasourceSelectionChange={handleDatasourceSelectionChange}
        getDatasourcesForSend={() => selectedDatasourcesRef.current ?? []}
        pluginLogoMap={pluginLogoMap}
        datasourcesLoading={datasources.isLoading}
        onSendMessageReady={handleSendMessageReady}
        onPasteToNotebook={pasteHandler || undefined}
        onSubmitFeedback={handleSubmitFeedback}
        notebookContext={notebookContext}
        isLoading={isLoading}
        conversationSlug={conversationSlug}
        conversationTitle={conversationTitle ?? conversation?.title}
        onDatasourceNameClick={_handleDatasourceNameClick}
        onTableNameClick={_handleTableNameClick}
        getDatasourceTooltip={_getDatasourceTooltip}
      />
      <NoDatasourceDialog ref={noDatasourceDialogRef} />
    </>
  );
});
