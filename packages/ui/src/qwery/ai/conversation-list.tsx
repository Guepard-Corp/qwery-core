'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '../../shadcn/command';
import { Button } from '../../shadcn/button';
import { sortByModifiedDesc } from '@qwery/shared/utils';
import { cn } from '../../lib/utils';
import { MessageCircle, Pencil, Check, X, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../shadcn/alert-dialog';
import { Checkbox } from '../../shadcn/checkbox';
import {
  formatRelativeTime,
  groupConversationsByTime,
  sortTimeGroups,
  type Conversation,
} from './utils/conversation-utils';

export interface ConversationListProps {
  conversations?: Conversation[];
  isLoading?: boolean;
  currentConversationId?: string;
  isProcessing?: boolean;
  processingConversationSlug?: string;
  onConversationSelect?: (conversationId: string) => void;
  onNewConversation?: () => void;
  onConversationEdit?: (conversationId: string, newTitle: string) => void;
  onConversationDelete?: (conversationId: string) => void;
  onConversationsDelete?: (conversationIds: string[]) => void;
  className?: string;
  showHeader?: boolean;
  searchPlaceholder?: string;
  showNewButton?: boolean;
  searchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
  isEditMode?: boolean;
  onEditModeChange?: (isEditMode: boolean) => void;
}

export function ConversationList({
  conversations = [],
  isLoading: _isLoading = false,
  currentConversationId,
  isProcessing: _isProcessing = false,
  processingConversationSlug,
  onConversationSelect,
  onNewConversation: _onNewConversation,
  onConversationEdit,
  onConversationDelete,
  onConversationsDelete,
  className,
  showHeader = true,
  searchPlaceholder: _searchPlaceholder = 'Search conversations...',
  showNewButton: _showNewButton = true,
  searchQuery: externalSearchQuery,
  onSearchQueryChange: _onSearchQueryChange,
  isEditMode: externalEditMode,
  onEditModeChange,
}: ConversationListProps) {
  const [internalSearchQuery, _setInternalSearchQuery] = useState('');
  const searchQuery =
    externalSearchQuery !== undefined
      ? externalSearchQuery
      : internalSearchQuery;

  const [internalEditMode, setInternalEditMode] = useState(false);
  const isEditMode =
    externalEditMode !== undefined ? externalEditMode : internalEditMode;
  const setIsEditMode = onEditModeChange || setInternalEditMode;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [animatingIds, setAnimatingIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [visibleCount, _setVisibleCount] = useState(20);
  const editInputRef = useRef<HTMLInputElement>(null);
  const previousTitlesRef = useRef<Map<string, string>>(new Map());

  const currentConversation = useMemo(() => {
    return conversations.find((c) => c.id === currentConversationId) || null;
  }, [conversations, currentConversationId]);

  const allConversations = useMemo(() => {
    const filtered = conversations.filter((c) => {
      const isNotCurrent = c.id !== currentConversationId;
      const matchesSearch = c.title
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      return isNotCurrent && matchesSearch;
    });
    return sortByModifiedDesc(filtered);
  }, [conversations, currentConversationId, searchQuery]);

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

  const handleConversationSelect = (conversationSlug: string) => {
    if (!isEditMode) {
      onConversationSelect?.(conversationSlug);
    }
  };

  const handleToggleSelect = (conversationId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const isRemoving = next.has(conversationId);

      if (isRemoving) {
        next.delete(conversationId);
      } else {
        next.add(conversationId);
      }

      // Auto-enter edit mode if a checkbox is checked and we're not already in it
      if (!isRemoving && !isEditMode) {
        setIsEditMode(true);
      }

      return next;
    });
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = () => {
    if (onConversationsDelete && selectedIds.size > 0) {
      onConversationsDelete(Array.from(selectedIds));
      setSelectedIds(new Set());
      setIsEditMode(false);
      setShowDeleteDialog(false);
    } else if (onConversationDelete && selectedIds.size === 1) {
      const id = Array.from(selectedIds)[0];
      if (id) {
        onConversationDelete(id);
        setSelectedIds(new Set());
        setIsEditMode(false);
        setShowDeleteDialog(false);
      }
    }
  };

  const handleStartEdit = (conversationId: string, currentTitle: string) => {
    setEditingId(conversationId);
    setEditValue(currentTitle);
  };

  const handleSaveEdit = (conversationId: string) => {
    const trimmedValue = editValue.trim();
    const currentTitle = conversations.find(
      (c) => c.id === conversationId,
    )?.title;

    if (!trimmedValue || trimmedValue.length < 1) {
      return;
    }

    if (trimmedValue !== currentTitle) {
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

  useEffect(() => {
    conversations.forEach((conversation) => {
      const previousTitle = previousTitlesRef.current.get(conversation.id);
      const currentTitle = conversation.title;

      if (previousTitle && previousTitle !== currentTitle) {
        setAnimatingIds((prev) => new Set(prev).add(conversation.id));
        setTimeout(() => {
          setAnimatingIds((prev) => {
            const next = new Set(prev);
            next.delete(conversation.id);
            return next;
          });
        }, 1000);
      }

      previousTitlesRef.current.set(conversation.id, currentTitle);
    });
  }, [conversations]);

  const isSearching = searchQuery.trim().length > 0;

  return (
    <div className={cn('flex h-full flex-col', className)}>
      <Command className="h-full rounded-none border-none bg-transparent">
        {showHeader && (
          <div className="shrink-0 border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <MessageCircle className="text-primary size-4" />
              <h2 className="font-semibold">Conversations</h2>
            </div>
          </div>
        )}
        {/* Batch Delete UI - Shown only in Edit Mode */}
        {isEditMode && (
          <div className="bg-destructive/5 border-destructive/10 animate-in fade-in slide-in-from-top-2 mb-4 flex items-center justify-between gap-3 rounded-xl border px-4 py-2 duration-300">
            <div className="text-destructive flex items-center gap-2">
              <Trash2 className="size-4" />
              <span className="text-sm font-semibold">
                {selectedIds.size}{' '}
                {selectedIds.size === 1 ? 'conversation' : 'conversations'}{' '}
                selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="destructive"
                onClick={handleDeleteSelected}
                disabled={selectedIds.size === 0}
                className="h-8 rounded-lg px-3 text-xs font-bold"
              >
                Delete Selected
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsEditMode(false)}
                className="hover:bg-destructive/10 hover:text-destructive h-8 text-xs font-medium"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
        <CommandList className="max-h-none flex-1 overflow-y-auto">
          <CommandEmpty>
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="bg-muted flex size-12 items-center justify-center rounded-full">
                <MessageCircle className="text-muted-foreground size-5" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">No conversations found</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Start a new conversation to get started
                </p>
              </div>
            </div>
          </CommandEmpty>

          {/* Current Conversation - Always on top */}
          {currentConversation && !isSearching && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 px-4 py-2">
                <div className="bg-border h-px flex-1" />
                <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                  Now
                </span>
                <div className="bg-border h-px flex-1" />
              </div>
              <CommandGroup heading="">
                <CommandItem
                  key={currentConversation.id}
                  value={currentConversation.id}
                  onSelect={() => {
                    if (isEditMode) {
                      handleToggleSelect(currentConversation.id);
                    } else if (editingId !== currentConversation.id) {
                      handleConversationSelect(currentConversation.slug);
                    }
                  }}
                  className={cn(
                    'group relative mx-2 my-0.5 rounded-md transition-all',
                    'bg-primary/10 hover:bg-primary/20',
                    isEditMode &&
                      selectedIds.has(currentConversation.id) &&
                      'bg-primary/5 hover:bg-primary/20',
                    'data-[selected=true]:bg-accent',
                  )}
                >
                  <div className="flex w-full items-center gap-2 px-2 py-1.5">
                    <div className="flex size-6 shrink-0 items-center justify-center">
                      {isEditMode ? (
                        <Checkbox
                          checked={selectedIds.has(currentConversation.id)}
                          onCheckedChange={() =>
                            handleToggleSelect(currentConversation.id)
                          }
                          onClick={(e) => e.stopPropagation()}
                          className="size-4 shrink-0"
                        />
                      ) : (
                        <div className="bg-primary/20 text-primary flex size-6 items-center justify-center rounded transition-colors">
                          <MessageCircle className="size-3" />
                        </div>
                      )}
                    </div>
                    {editingId === currentConversation.id ? (
                      <div className="flex min-w-0 flex-1 items-center gap-1.5">
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSaveEdit(currentConversation.id);
                            } else if (e.key === 'Escape') {
                              handleCancelEdit();
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className={cn(
                            'bg-background flex-1 rounded border px-2 py-1 text-sm outline-none focus:ring-1',
                            editValue.trim().length < 1
                              ? 'border-destructive focus:ring-destructive'
                              : 'border-input focus:ring-ring',
                          )}
                          minLength={1}
                          required
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSaveEdit(currentConversation.id);
                          }}
                          disabled={editValue.trim().length < 1}
                          className={cn(
                            'rounded p-1 transition-colors',
                            editValue.trim().length < 1
                              ? 'text-muted-foreground cursor-not-allowed opacity-50'
                              : 'text-primary hover:bg-accent',
                          )}
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
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span
                            className={cn(
                              'text-primary truncate text-sm font-medium transition-all duration-300',
                              animatingIds.has(currentConversation.id) &&
                                'animate-in fade-in-0 slide-in-from-left-2',
                            )}
                          >
                            {currentConversation.title}
                          </span>
                          <span className="text-muted-foreground truncate text-xs">
                            {formatRelativeTime(
                              currentConversation.updatedAt,
                              true,
                            )}
                          </span>
                        </div>
                        {!isEditMode && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEdit(
                                currentConversation.id,
                                currentConversation.title,
                              );
                            }}
                            className="text-muted-foreground hover:text-foreground hover:bg-accent shrink-0 rounded p-1 opacity-0 transition-all group-hover:opacity-100"
                          >
                            <Pencil className="size-3" />
                          </button>
                        )}
                        {processingConversationSlug ===
                        currentConversation.slug ? (
                          <div className="flex shrink-0 items-center">
                            <div className="size-2 animate-pulse rounded-full bg-yellow-500 shadow-sm shadow-yellow-500/50" />
                          </div>
                        ) : (
                          <div className="flex shrink-0 items-center">
                            <div className="bg-primary size-1.5 rounded-full" />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </CommandItem>
              </CommandGroup>
            </div>
          )}

          {/* Existing Conversations */}
          {isSearching ? (
            <CommandGroup heading="">
              {allConversations.map((conversation) => (
                <CommandItem
                  key={conversation.id}
                  value={conversation.id}
                  onSelect={() => {
                    if (isEditMode) {
                      handleToggleSelect(conversation.id);
                    } else if (editingId !== conversation.id) {
                      handleConversationSelect(conversation.slug);
                    }
                  }}
                  className={cn(
                    'group relative mx-1 my-0.5 rounded-md transition-all',
                    'hover:bg-accent/50',
                    conversation.id === currentConversationId &&
                      'bg-primary/10 hover:bg-primary/20',
                    isEditMode &&
                      selectedIds.has(conversation.id) &&
                      'bg-primary/5 hover:bg-primary/20',
                    'data-[selected=true]:bg-accent',
                  )}
                >
                  <div className="flex w-full items-center gap-2 px-2 py-1.5">
                    <div className="flex size-6 shrink-0 items-center justify-center">
                      {isEditMode ? (
                        <Checkbox
                          checked={selectedIds.has(conversation.id)}
                          onCheckedChange={() =>
                            handleToggleSelect(conversation.id)
                          }
                          onClick={(e) => e.stopPropagation()}
                          className="size-4 shrink-0"
                        />
                      ) : (
                        <div className="group/icon-container relative flex size-6 items-center justify-center">
                          <div
                            className={cn(
                              'flex size-6 items-center justify-center rounded transition-all group-hover/icon-container:opacity-0',
                              conversation.id === currentConversationId
                                ? 'bg-primary/20 text-primary'
                                : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary',
                            )}
                          >
                            <MessageCircle className="size-3" />
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover/icon-container:opacity-100">
                            <Checkbox
                              checked={selectedIds.has(conversation.id)}
                              onCheckedChange={() =>
                                handleToggleSelect(conversation.id)
                              }
                              onClick={(e) => e.stopPropagation()}
                              className="size-4 shrink-0 transition-all"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate text-sm font-medium">
                        {conversation.title}
                      </span>
                      <span className="text-muted-foreground truncate text-xs">
                        {formatRelativeTime(
                          conversation.updatedAt,
                          conversation.id === currentConversationId,
                        )}
                      </span>
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : (
            sortedGroups.map((groupKey) => {
              const groupConversations = groupedConversations[groupKey];
              if (!groupConversations || groupConversations.length === 0)
                return null;

              return (
                <div key={groupKey} className="space-y-1">
                  <div className="flex items-center gap-2 px-4 py-2">
                    <div className="bg-border h-px flex-1" />
                    <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                      {groupKey}
                    </span>
                    <div className="bg-border h-px flex-1" />
                  </div>
                  <CommandGroup heading="">
                    {groupConversations.map((conversation) => {
                      const isCurrent =
                        conversation.id === currentConversationId;
                      const isEditing = editingId === conversation.id;
                      const isSelected = selectedIds.has(conversation.id);

                      return (
                        <CommandItem
                          key={conversation.id}
                          value={conversation.id}
                          onSelect={() => {
                            if (isEditMode) {
                              handleToggleSelect(conversation.id);
                            } else if (!isEditing) {
                              handleConversationSelect(conversation.slug);
                            }
                          }}
                          className={cn(
                            'group relative mx-1 my-0.5 rounded-md transition-all',
                            'hover:bg-accent/50',
                            isCurrent && 'bg-primary/10 hover:bg-primary/20',
                            isEditMode &&
                              isSelected &&
                              'bg-primary/5 hover:bg-primary/20',
                            'data-[selected=true]:bg-accent',
                          )}
                        >
                          <div className="flex w-full items-center gap-2 px-2 py-1.5">
                            <div className="flex size-6 shrink-0 items-center justify-center">
                              {isEditMode ? (
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() =>
                                    handleToggleSelect(conversation.id)
                                  }
                                  onClick={(e) => e.stopPropagation()}
                                  className="size-4 shrink-0 transition-all"
                                />
                              ) : (
                                <div className="group/icon-container relative flex size-6 items-center justify-center">
                                  <div
                                    className={cn(
                                      'flex size-6 items-center justify-center rounded transition-all group-hover/icon-container:opacity-0',
                                      isCurrent
                                        ? 'bg-primary/20 text-primary'
                                        : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary',
                                    )}
                                  >
                                    <MessageCircle className="size-3" />
                                  </div>
                                  <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover/icon-container:opacity-100">
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={() =>
                                        handleToggleSelect(conversation.id)
                                      }
                                      onClick={(e) => e.stopPropagation()}
                                      className="size-4 shrink-0 transition-all"
                                    />
                                  </div>
                                </div>
                              )}
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
                                  className={cn(
                                    'bg-background flex-1 rounded border px-2 py-1 text-sm outline-none focus:ring-1',
                                    editValue.trim().length < 1
                                      ? 'border-destructive focus:ring-destructive'
                                      : 'border-input focus:ring-ring',
                                  )}
                                  minLength={1}
                                  required
                                />
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSaveEdit(conversation.id);
                                  }}
                                  disabled={editValue.trim().length < 1}
                                  className={cn(
                                    'rounded p-1 transition-colors',
                                    editValue.trim().length < 1
                                      ? 'text-muted-foreground cursor-not-allowed opacity-50'
                                      : 'text-primary hover:bg-accent',
                                  )}
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
                                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                                  <span
                                    className={cn(
                                      'truncate text-sm font-medium transition-all duration-300',
                                      isCurrent && 'text-primary',
                                      animatingIds.has(conversation.id) &&
                                        'animate-in fade-in-0 slide-in-from-left-2 text-primary',
                                    )}
                                  >
                                    {conversation.title}
                                  </span>
                                  <span className="text-muted-foreground truncate text-xs">
                                    {formatRelativeTime(
                                      conversation.updatedAt,
                                      false,
                                    )}
                                  </span>
                                </div>
                                {!isEditMode && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStartEdit(
                                        conversation.id,
                                        conversation.title,
                                      );
                                    }}
                                    className="text-muted-foreground hover:text-foreground hover:bg-accent shrink-0 rounded p-1 opacity-0 transition-all group-hover:opacity-100"
                                  >
                                    <Pencil className="size-3" />
                                  </button>
                                )}
                                {processingConversationSlug ===
                                conversation.slug ? (
                                  <div className="flex shrink-0 items-center">
                                    <div className="size-2 animate-pulse rounded-full bg-yellow-500 shadow-sm shadow-yellow-500/50" />
                                  </div>
                                ) : isCurrent ? (
                                  <div className="flex shrink-0 items-center">
                                    <div className="bg-primary size-1.5 rounded-full" />
                                  </div>
                                ) : null}
                              </>
                            )}
                          </div>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </div>
              );
            })
          )}
        </CommandList>
      </Command>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedIds.size === 1 ? 'conversation' : 'conversations'}
              ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedIds.size === 1 ? (
                <>
                  Are you sure you want to delete this conversation? This action
                  cannot be undone and will permanently remove the conversation
                  and all its messages.
                </>
              ) : (
                <>
                  Are you sure you want to delete {selectedIds.size}{' '}
                  conversations? This action cannot be undone and will
                  permanently remove these conversations and all their messages.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
