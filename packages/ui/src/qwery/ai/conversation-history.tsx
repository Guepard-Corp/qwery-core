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
  MessageSquare,
  MessageCircle,
  Plus,
  Pencil,
  Check,
  X,
  Edit,
  Trash2,
  Loader2,
} from 'lucide-react';
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
export type { Conversation };

export interface ConversationHistoryProps {
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
}

export function ConversationHistory({
  conversations = [],
  isLoading: _isLoading = false,
  currentConversationId,
  isProcessing: _isProcessing = false,
  processingConversationSlug,
  onConversationSelect,
  onNewConversation,
  onConversationEdit,
  onConversationDelete,
  onConversationsDelete,
}: ConversationHistoryProps) {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [animatingIds, setAnimatingIds] = useState<Set<string>>(new Set());
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [visibleCount, setVisibleCount] = useState(20);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);
  const previousTitlesRef = useRef<Map<string, string>>(new Map());

  const currentConversation = useMemo(() => {
    return conversations.find((c) => c.id === currentConversationId) || null;
  }, [conversations, currentConversationId]);

  const allConversations = useMemo(() => {
    return conversations
      .filter((c) => c.id !== currentConversationId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }, [conversations, currentConversationId]);

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

  const handleConversationSelect = (conversationSlug: string) => {
    if (!isEditMode) {
      onConversationSelect?.(conversationSlug);
      setOpen(false);
    }
  };

  const handleNewConversation = () => {
    onNewConversation?.();
    setOpen(false);
  };

  const handleToggleEditMode = () => {
    setIsEditMode(!isEditMode);
    if (isEditMode) {
      setSelectedIds(new Set());
    }
  };

  const handleToggleSelect = (conversationId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(conversationId)) {
        next.delete(conversationId);
      } else {
        next.add(conversationId);
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

  const hasResetRef = useRef(false);
  useEffect(() => {
    if (open && !hasResetRef.current) {
      hasResetRef.current = true;
      requestAnimationFrame(() => {
        setVisibleCount(20);
      });
    } else if (!open) {
      hasResetRef.current = false;
    }
  }, [open]);

  const handleLoadMore = () => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setVisibleCount((prev) => Math.min(prev + 20, allConversations.length));
      setIsLoadingMore(false);
    }, 100);
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
        <MessageSquare className="size-4" />
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <div className="border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <MessageCircle className="text-primary size-4" />
            <h2 className="font-semibold">Conversations</h2>
          </div>
        </div>
        <div className="mb-3 flex items-center gap-2 border-b p-2 [&_[cmdk-input-wrapper]]:min-w-0 [&_[cmdk-input-wrapper]]:flex-1 [&_[cmdk-input-wrapper]]:border-0">
          <CommandInput placeholder="Search conversations..." />
          {isEditMode ? (
            <>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleDeleteSelected}
                className="shrink-0 gap-1.5"
                disabled={selectedIds.size === 0}
              >
                <Trash2 className="size-3.5" />
                Delete {selectedIds.size > 0 && `(${selectedIds.size})`}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleToggleEditMode}
                className="shrink-0 gap-1.5"
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={handleNewConversation}
                className="shrink-0 gap-1.5"
              >
                <Plus className="size-3.5" />
                New
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleToggleEditMode}
                className="shrink-0 gap-1.5"
              >
                <Edit className="size-3.5" />
                Edit
              </Button>
            </>
          )}
        </div>
        <CommandList className="max-h-[500px]">
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
          {currentConversation && (
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
                    'group relative mx-2 my-0.5 rounded-md border transition-all',
                    'border-primary/20 bg-primary/10 hover:border-primary/30',
                    isEditMode &&
                      selectedIds.has(currentConversation.id) &&
                      'border-primary bg-primary/5 hover:border-primary/80',
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
          {sortedGroups.map((groupKey) => {
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
                    const isCurrent = conversation.id === currentConversationId;
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
                          'group relative mx-2 my-0.5 rounded-md border transition-all',
                          'border-border/50 hover:border-border hover:bg-accent/50',
                          isCurrent &&
                            'bg-primary/10 border-primary/20 hover:border-primary/30',
                          isEditMode &&
                            isSelected &&
                            'border-primary bg-primary/5 hover:border-primary/80',
                          isEditMode &&
                            !isSelected &&
                            'border-border/50 hover:border-border',
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
                                className="size-4 shrink-0"
                              />
                            ) : (
                              <div
                                className={cn(
                                  'flex size-6 items-center justify-center rounded transition-colors',
                                  isCurrent
                                    ? 'bg-primary/20 text-primary'
                                    : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary',
                                )}
                              >
                                <MessageCircle className="size-3" />
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
          })}

          {/* Load More Button */}
          {hasMore && (
            <div className="flex items-center justify-center border-t p-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="w-full"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Load More'
                )}
              </Button>
            </div>
          )}
        </CommandList>
      </CommandDialog>

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
    </>
  );
}
