import { useMemo } from 'react';
import type { Conversation } from '../utils/conversation-utils';
import {
  groupConversationsByTime,
  sortTimeGroups,
} from '../utils/conversation-utils';

export interface UseConversationListOptions {
  conversations: Conversation[];
  currentConversationId?: string;
  searchQuery?: string;
  visibleCount?: number;
}

export interface UseConversationListReturn {
  currentConversation: Conversation | null;
  allConversations: Conversation[];
  visibleConversations: Conversation[];
  groupedConversations: Record<string, Conversation[]>;
  sortedGroups: string[];
  hasMore: boolean;
}

/**
 * Hook for managing conversation list data with filtering, grouping, and pagination
 */
export function useConversationList({
  conversations,
  currentConversationId,
  searchQuery = '',
  visibleCount = 20,
}: UseConversationListOptions): UseConversationListReturn {
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) {
      return conversations;
    }
    const query = searchQuery.toLowerCase();
    return conversations.filter((conv) =>
      conv.title.toLowerCase().includes(query),
    );
  }, [conversations, searchQuery]);

  const currentConversation = useMemo(() => {
    return (
      filteredConversations.find((c) => c.id === currentConversationId) || null
    );
  }, [filteredConversations, currentConversationId]);

  const allConversations = useMemo(() => {
    return filteredConversations
      .filter((c) => c.id !== currentConversationId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }, [filteredConversations, currentConversationId]);

  const visibleConversations = useMemo(() => {
    return allConversations.slice(0, visibleCount);
  }, [allConversations, visibleCount]);

  const { groups: groupedConversations } = useMemo(() => {
    return groupConversationsByTime(
      visibleConversations,
      currentConversationId,
    );
  }, [visibleConversations, currentConversationId]);

  const sortedGroups = useMemo(() => {
    return sortTimeGroups(groupedConversations);
  }, [groupedConversations]);

  const hasMore = allConversations.length > visibleCount;

  return {
    currentConversation,
    allConversations,
    visibleConversations,
    groupedConversations,
    sortedGroups,
    hasMore,
  };
}
