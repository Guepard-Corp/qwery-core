'use client';

import {
  useMemo,
  useImperativeHandle,
  forwardRef,
  useRef,
  useState,
  useCallback,
} from 'react';
import QweryAgentUI from '@qwery/ui/agent-ui';
import { SUPPORTED_MODELS, transportFactory } from '@qwery/agent-factory-sdk';
import { MessageOutput, UsageOutput } from '@qwery/domain/usecases';
import { convertMessages } from '~/lib/utils/messages-converter';
import { useWorkspace } from '~/lib/context/workspace-context';
import { getUsageKey, useGetUsage } from '~/lib/queries/use-get-usage';
import { QweryContextProps } from 'node_modules/@qwery/ui/src/qwery/ai/context';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { getAllExtensionMetadata } from '@qwery/extensions-sdk';
import { useGetDatasourcesByProjectId } from '~/lib/queries/use-get-datasources';
import type { DatasourceItem } from '@qwery/ui/ai';
import { useGetConversationBySlug } from '~/lib/queries/use-get-conversations';
import { useUpdateConversation } from '~/lib/mutations/use-conversation';
import { apiPut } from '~/lib/repositories/api-client';

export interface AgentUIWrapperRef {
  sendMessage: (text: string) => void;
}

export interface AgentUIWrapperProps {
  conversationSlug: string;
  initialMessages?: MessageOutput[];
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
>(function AgentUIWrapper({ conversationSlug, initialMessages }, ref) {
  const sendMessageRef = useRef<((text: string) => void) | null>(null);
  const { repositories, workspace } = useWorkspace();
  const { data: usage } = useGetUsage(
    repositories.usage,
    repositories.conversation,
    conversationSlug,
    workspace.userId,
  );
  const queryClient = useQueryClient();

  // Load current conversation to get existing datasources
  const { data: conversation } = useGetConversationBySlug(
    repositories.conversation,
    conversationSlug,
  );

  // Derive selected datasources from conversation
  const conversationDatasources = useMemo(
    () => conversation?.datasources || [],
    [conversation?.datasources],
  );

  // Track pending user changes (cleared after successful mutation)
  const [pendingDatasources, setPendingDatasources] = useState<string[] | null>(
    null,
  );

  // Use pending datasources if available, otherwise use conversation datasources
  const selectedDatasources =
    pendingDatasources !== null ? pendingDatasources : conversationDatasources;

  // Mutation to update conversation datasources
  const updateConversation = useUpdateConversation(repositories.conversation);

  // Fetch datasources for the current project
  const datasources = useGetDatasourcesByProjectId(
    repositories.datasource,
    workspace.projectId || '',
    { enabled: !!workspace.projectId },
  );

  // Fetch extension metadata for datasource icons
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

  // Convert datasources to DatasourceItem format
  const datasourceItems = useMemo<DatasourceItem[]>(() => {
    if (!datasources.data) return [];
    return datasources.data.map((ds) => ({
      id: ds.id,
      name: ds.name,
      slug: ds.slug,
      datasource_provider: ds.datasource_provider,
    }));
  }, [datasources.data]);

  const handleMessageUpdate = async (messageId: string, content: string) => {
    await apiPut(`/message/${messageId}`, { content });
  };

  useImperativeHandle(
    ref,
    () => ({
      sendMessage: (text: string) => {
        sendMessageRef.current?.(text);
      },
    }),
    [],
  );

  const transport = useMemo(
    () => (model: string) => {
      return transportFactory(conversationSlug, model, repositories);
    },
    [conversationSlug, repositories],
  );

  const handleEmitFinish = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: getUsageKey(conversationSlug, workspace.userId),
    });
  }, [queryClient, conversationSlug, workspace.userId]);

  // Handle datasource selection change and save to conversation
  const handleDatasourceSelectionChange = useCallback(
    (datasourceIds: string[]) => {
      // Set pending datasources for immediate UI update
      setPendingDatasources(datasourceIds);

      // Save to conversation if conversation is loaded
      if (conversation?.id) {
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
      }
    },
    [conversation, updateConversation, workspace.username, workspace.userId],
  );

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
      onMessageUpdate={handleMessageUpdate}
    />
  );
});
