'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
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
  History,
  MessageCircle,
  Plus,
  Pencil,
  Check,
  X,
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
  onConversationEdit?: (conversationId: string, newTitle: string) => void;
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
  
  const day = date.getDate();
  const month = date.toLocaleDateString('en-US', { month: 'long' });
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
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
    groups[group]!.push(conversation);
  });

  Object.keys(groups).forEach((key) => {
    const group = groups[key];
    if (group) {
      group.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
  });

  return groups;
}

function sortTimeGroups(groups: Record<string, Conversation[]>): string[] {
  const keys = Object.keys(groups);
  return keys.sort((a, b) => {
    if (a === 'Today') return -1;
    if (b === 'Today') return 1;
    
    if (a === 'Yesterday') return -1;
    if (b === 'Yesterday') return 1;
    const dateA = parseDateString(a);
    const dateB = parseDateString(b);
    
    if (dateA && dateB) {
      return dateB.getTime() - dateA.getTime();
    }
    
    return a.localeCompare(b);
  });
}

function parseDateString(dateStr: string): Date | null {
  const parts = dateStr.split(' ');
  if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
    const day = parseInt(parts[0], 10);
    const monthName = parts[1];
    const year = parseInt(parts[2], 10);
    
    if (!isNaN(day) && !isNaN(year) && monthName) {
      const monthIndex = new Date(`${monthName} 1, 2000`).getMonth();
      if (!isNaN(monthIndex)) {
        return new Date(year, monthIndex, day);
      }
    }
  }
  return null;
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

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

  const handleStartEdit = (conversationId: string, currentTitle: string) => {
    setEditingId(conversationId);
    setEditValue(currentTitle);
  };

  const handleSaveEdit = (conversationId: string) => {
    const trimmedValue = editValue.trim();
    const currentTitle = conversations.find(c => c.id === conversationId)?.title;
    
    if (trimmedValue && trimmedValue !== currentTitle) {
      onConversationEdit?.(conversationId, trimmedValue);
    }
    setEditingId(null);
    setEditValue('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="cursor-pointer"
        data-test="conversation-history-button"
      >
        <History className="size-4" />
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <div className="border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <MessageCircle className="text-primary size-4" />
            <h2 className="font-semibold">Conversations</h2>
          </div>
        </div>
        <div className="mb-3 border-b flex items-center gap-2 p-2 [&_[cmdk-input-wrapper]]:border-0 [&_[cmdk-input-wrapper]]:flex-1 [&_[cmdk-input-wrapper]]:min-w-0">
          <CommandInput placeholder="Search conversations..." />
          <Button
            size="sm"
            variant="outline"
            onClick={handleNewConversation}
            className="gap-1.5 shrink-0"
          >
            <Plus className="size-3.5" />
            New
          </Button>
        </div>
        <CommandList className="max-h-[500px]">
          <CommandEmpty>
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="bg-muted flex size-12 items-center justify-center rounded-full">
                <MessageCircle className="text-muted-foreground size-5" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">No conversations found</p>
                <p className="text-muted-foreground text-xs mt-1">
                  Start a new conversation to get started
                </p>
              </div>
            </div>
          </CommandEmpty>

          {/* Existing Conversations */}
          {sortedGroups.map((groupKey) => {
            const groupConversations = groupedConversations[groupKey];
            if (!groupConversations || groupConversations.length === 0)
              return null;

            return (
              <div key={groupKey} className="space-y-1">
                <div className="flex items-center gap-2 px-4 py-2">
                  <div className="bg-border h-px flex-1" />
                  <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                    {groupKey}
                  </span>
                  <div className="bg-border h-px flex-1" />
                </div>
                <CommandGroup heading="">
                {groupConversations.map((conversation) => {
                  const isCurrent = conversation.id === currentConversationId;
                  const isEditing = editingId === conversation.id;
                  
                  return (
                    <CommandItem
                      key={conversation.id}
                      value={conversation.id}
                      onSelect={() => {
                        if (!isEditing) {
                          handleConversationSelect(conversation.slug);
                        }
                      }}
                      className={cn(
                        'group relative mx-2 my-0.5 rounded-md transition-all',
                        'hover:bg-accent/50',
                        isCurrent &&
                          'bg-primary/10 border border-primary/20',
                        'data-[selected=true]:bg-accent',
                      )}
                    >
                      <div className="flex w-full items-center gap-2 px-2 py-1.5">
                        <div
                          className={cn(
                            'flex size-6 shrink-0 items-center justify-center rounded transition-colors',
                            isCurrent
                              ? 'bg-primary/20 text-primary'
                              : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary',
                          )}
                        >
                          <MessageCircle className="size-3" />
                        </div>
                        {isEditing ? (
                          <div className="flex min-w-0 flex-1 items-center gap-1.5">
                            <input
                              ref={editInputRef}
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleSaveEdit(conversation.id);
                                } else if (e.key === 'Escape') {
                                  handleCancelEdit();
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="flex-1 bg-background border border-input rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-ring"
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSaveEdit(conversation.id);
                              }}
                              className="text-primary hover:bg-accent rounded p-1 transition-colors"
                            >
                              <Check className="size-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancelEdit();
                              }}
                              className="text-muted-foreground hover:bg-accent rounded p-1 transition-colors"
                            >
                              <X className="size-3.5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex min-w-0 flex-1 items-center">
                              <span
                                className={cn(
                                  'truncate text-sm font-medium',
                                  isCurrent && 'text-primary',
                                )}
                              >
                                {conversation.title}
                              </span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartEdit(conversation.id, conversation.title);
                              }}
                              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground hover:bg-accent rounded p-1 transition-all shrink-0"
                            >
                              <Pencil className="size-3" />
                            </button>
                            {isCurrent && (
                              <div className="flex shrink-0 items-center">
                                <div className="bg-primary size-1.5 rounded-full" />
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </CommandItem>
                  );
                })}
                </CommandGroup>
              </div>
            );
          })}
        </CommandList>
      </CommandDialog>
    </>
  );
}
