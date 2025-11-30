'use client';

import { useState, useMemo } from 'react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../../shadcn/command';
import { Button } from '../../shadcn/button';
import { cn } from '../../lib/utils';
import {
  ClockIcon,
  MessageSquareIcon,
  PencilIcon,
  TrashIcon,
} from 'lucide-react';

export interface Conversation {
  id: string;
  slug: string;
  title: string;
  createdAt: Date;
}

export interface ConversationHistoryProps {
  conversations?: Conversation[];
  isLoading?: boolean;
  currentConversationId?: string;
  onConversationSelect?: (conversationId: string) => void;
  onNewConversation?: () => void;
  onConversationEdit?: (conversationId: string) => void;
  onConversationDelete?: (conversationId: string) => void;
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Today';
  }
  if (diffDays === 1) {
    return 'Yesterday';
  }
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks}w ago`;
  }
  const months = Math.floor(diffDays / 30);
  return `${months}mo ago`;
}

function groupConversationsByTime(
  conversations: Conversation[],
): Record<string, Conversation[]> {
  const groups: Record<string, Conversation[]> = {};

  conversations.forEach((conversation) => {
    const group = formatRelativeTime(conversation.createdAt);
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(conversation);
  });

  // Sort conversations within each group by date (newest first)
  Object.keys(groups).forEach((key) => {
    const group = groups[key];
    if (group) {
      group.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
  });

  return groups;
}

const TIME_ORDER = [
  'Today',
  'Yesterday',
  '2d ago',
  '3d ago',
  '4d ago',
  '5d ago',
  '6d ago',
  '1w ago',
  '2w ago',
  '1mo ago',
];

function sortTimeGroups(groups: Record<string, Conversation[]>): string[] {
  const keys = Object.keys(groups);
  return keys.sort((a, b) => {
    const aIndex = TIME_ORDER.indexOf(a);
    const bIndex = TIME_ORDER.indexOf(b);

    // If both are in the order list, sort by index
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }
    // If only one is in the list, prioritize it
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    // If neither is in the list, sort alphabetically
    return a.localeCompare(b);
  });
}

export function ConversationHistory({
  conversations = [],
  isLoading: _isLoading = false,
  currentConversationId,
  onConversationSelect,
  onNewConversation,
  onConversationEdit,
  onConversationDelete,
}: ConversationHistoryProps) {
  const [open, setOpen] = useState(false);

  const groupedConversations = useMemo(() => {
    return groupConversationsByTime(conversations);
  }, [conversations]);

  const sortedGroups = useMemo(() => {
    return sortTimeGroups(groupedConversations);
  }, [groupedConversations]);

  const handleConversationSelect = (conversationSlug: string) => {
    onConversationSelect?.(conversationSlug);
    setOpen(false);
  };

  const handleNewConversation = () => {
    onNewConversation?.();
    setOpen(false);
  };

  const handleConversationEdit = (
    e: React.MouseEvent,
    conversationId: string,
  ) => {
    e.stopPropagation();
    onConversationEdit?.(conversationId);
  };

  const handleConversationDelete = (
    e: React.MouseEvent,
    conversationId: string,
  ) => {
    e.stopPropagation();
    onConversationDelete?.(conversationId);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="cursor-pointer"
        data-test="conversation-history-button"
      >
        <ClockIcon className="size-4" />
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search..." />
        <CommandList className="max-h-[500px]">
          <CommandEmpty>No conversations found.</CommandEmpty>

          {/* New Conversation Option */}
          <CommandGroup heading="Today">
            <CommandItem
              onSelect={handleNewConversation}
              className={cn(
                'flex cursor-pointer items-center justify-between',
                !currentConversationId && 'bg-accent text-accent-foreground',
              )}
            >
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <MessageSquareIcon className="size-4 shrink-0" />
                <span className="truncate">New Conversation</span>
              </div>
              {!currentConversationId && (
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-muted-foreground text-xs">Current</span>
                </div>
              )}
            </CommandItem>
          </CommandGroup>

          {/* Existing Conversations */}
          {sortedGroups.map((groupKey) => {
            const groupConversations = groupedConversations[groupKey];
            if (!groupConversations || groupConversations.length === 0)
              return null;

            return (
              <CommandGroup key={groupKey} heading={groupKey}>
                {groupConversations.map((conversation) => {
                  const isCurrent = conversation.id === currentConversationId;
                  return (
                    <CommandItem
                      key={conversation.id}
                      onSelect={() =>
                        handleConversationSelect(conversation.slug)
                      }
                      className={cn(
                        'flex items-center justify-between',
                        isCurrent && 'bg-accent text-accent-foreground',
                      )}
                    >
                      <div className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                        <MessageSquareIcon className="size-4 shrink-0" />
                        <span className="truncate">{conversation.title}</span>
                      </div>
                      {isCurrent && (
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="text-muted-foreground text-xs">
                            Current
                          </span>
                          <button
                            onClick={(e) =>
                              handleConversationEdit(e, conversation.id)
                            }
                            className="hover:bg-accent rounded p-1"
                            data-test="conversation-edit-button"
                          >
                            <PencilIcon className="size-3" />
                          </button>
                          <button
                            onClick={(e) =>
                              handleConversationDelete(e, conversation.id)
                            }
                            className="hover:bg-accent rounded p-1"
                            data-test="conversation-delete-button"
                          >
                            <TrashIcon className="size-3" />
                          </button>
                        </div>
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            );
          })}
        </CommandList>
      </CommandDialog>
    </>
  );
}
