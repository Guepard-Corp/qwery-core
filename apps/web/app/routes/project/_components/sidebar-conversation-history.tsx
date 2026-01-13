'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import {
  MessageCircle,
  Pencil,
  Check,
  X,
  Bookmark,
  Copy,
  Share2,
  Trash2,
  MoreHorizontal,
} from 'lucide-react';
import { cn, truncateChatTitle } from '@qwery/ui/utils';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@qwery/ui/shadcn-sidebar';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from '@qwery/ui/context-menu';
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@qwery/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@qwery/ui/dropdown-menu';
import { ChevronRight, ArrowRight } from 'lucide-react';
import { Button } from '@qwery/ui/button';
import { Input } from '@qwery/ui/input';
import { createPath } from '~/config/paths.config';
import pathsConfig from '~/config/paths.config';
import {
  type Conversation,
  ConfirmDeleteDialog,
} from '@qwery/ui/ai';
import { LoadingSkeleton } from '@qwery/ui/loading-skeleton';

export interface SidebarConversationHistoryProps {
  conversations?: Conversation[];
  isLoading?: boolean;
  currentConversationId?: string;
  isProcessing?: boolean;
  processingConversationSlug?: string;
  searchQuery?: string;
  onConversationSelect?: (conversationSlug: string) => void;
  onConversationEdit?: (conversationId: string, newTitle: string) => void;
  onConversationDelete?: (conversationId: string) => void;
  onConversationDuplicate?: (conversationId: string) => void;
  onConversationShare?: (conversationId: string) => void;
  onConversationBookmark?: (conversationId: string) => void;
}

export function SidebarConversationHistory({
  conversations = [],
  isLoading = false,
  currentConversationId,
  isProcessing = false,
  processingConversationSlug,
  searchQuery = '',
  onConversationSelect,
  onConversationEdit,
  onConversationDelete,
  onConversationDuplicate,
  onConversationShare,
  onConversationBookmark,
}: SidebarConversationHistoryProps) {
  const location = useLocation();
  const params = useParams();
  
  // Get project slug from pathname or params
  const projectSlugMatch = location.pathname.match(/^\/prj\/([^/]+)/);
  const projectSlug = params.slug || projectSlugMatch?.[1];
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [animatingIds, setAnimatingIds] = useState<Set<string>>(new Set());
  const [isRecentsOpen, setIsRecentsOpen] = useState(true);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('bookmarked-conversations');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    }
    return new Set();
  });
  const editInputRef = useRef<HTMLInputElement>(null);
  const previousTitlesRef = useRef<Map<string, string>>(new Map());
  const justEnteredEditModeRef = useRef(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);

  const [selectionOrderMap, setSelectionOrderMap] = useState<Map<string, number>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('conversation-selection-order');
        if (stored) {
          const data = JSON.parse(stored);
          if (Array.isArray(data)) {
            const map = new Map<string, number>();
            data.forEach((id: string, index: number) => {
              map.set(id, Date.now() - index * 1000);
            });
            return map;
          } else if (typeof data === 'object' && data !== null) {
            return new Map(Object.entries(data));
          }
        }
      } catch (error) {
        console.error('Failed to load selection order:', error);
      }
    }
    return new Map<string, number>();
  });

  // Update selection order when current conversation changes
  useEffect(() => {
    if (currentConversationId && typeof window !== 'undefined') {
      setSelectionOrderMap((prev) => {
        const newMap = new Map(prev);
        newMap.set(currentConversationId, Date.now());

        if (newMap.size > 100) {
          const entries = Array.from(newMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 100);
          newMap.clear();
          entries.forEach(([id, timestamp]) => newMap.set(id, timestamp));
        }

        try {
          const serializable = Object.fromEntries(newMap);
          localStorage.setItem(
            'conversation-selection-order',
            JSON.stringify(serializable),
          );
        } catch (error) {
          console.error('Failed to save selection order:', error);
        }

        return newMap;
      });
    }
  }, [currentConversationId]);

  // Filter conversations by search query and sort by bookmarked first
  const filteredConversations = useMemo(() => {
    let filtered = conversations;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = conversations.filter((conv) =>
        conv.title.toLowerCase().includes(query),
      );
    }
    // Sort: bookmarked first, then by updatedAt
    return [...filtered].sort((a, b) => {
      const aBookmarked = bookmarkedIds.has(a.id);
      const bBookmarked = bookmarkedIds.has(b.id);
      if (aBookmarked && !bBookmarked) return -1;
      if (!aBookmarked && bBookmarked) return 1;
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    });
  }, [conversations, searchQuery, bookmarkedIds]);

  // Get current conversation separately
  const currentConversation = useMemo(() => {
    return filteredConversations.find(
      (c) => c.id === currentConversationId,
    ) || null;
  }, [filteredConversations, currentConversationId]);

  // Sort conversations by selection order: current first, then by selection timestamp, then by updatedAt
  const otherConversations = useMemo(() => {
    const others = filteredConversations.filter(
      (c) => c.id !== currentConversationId,
    );

    return others.sort((a, b) => {
      const aTimestamp = selectionOrderMap.get(a.id);
      const bTimestamp = selectionOrderMap.get(b.id);

      // Both have selection timestamps: sort by timestamp descending (higher = more recent)
      if (aTimestamp !== undefined && bTimestamp !== undefined) {
        return bTimestamp - aTimestamp;
      }
      // Only a has timestamp: a comes first
      if (aTimestamp !== undefined) return -1;
      // Only b has timestamp: b comes first
      if (bTimestamp !== undefined) return 1;
      // Neither has timestamp: sort by updatedAt
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    });
  }, [filteredConversations, currentConversationId, selectionOrderMap]);

  // Limit conversations to 7 items for sidebar display
  const MAX_SIDEBAR_CHATS = 7;
  const limitedConversations = useMemo(() => {
    return otherConversations.slice(0, MAX_SIDEBAR_CHATS);
  }, [otherConversations]);

  const handleStartEdit = (conversationId: string, currentTitle: string) => {
    setEditingId(conversationId);
    setEditValue(currentTitle);
    justEnteredEditModeRef.current = true;
  };

  const handleSaveEdit = (conversationId: string) => {
    const trimmedValue = editValue.trim();
    const currentTitle = filteredConversations.find(
      (c) => c.id === conversationId,
    )?.title;

    if (!trimmedValue || trimmedValue.length < 1) {
      // If empty, restore original title
      setEditValue(currentTitle || '');
      setEditingId(null);
      return;
    }

    if (trimmedValue !== currentTitle) {
      onConversationEdit?.(conversationId, trimmedValue);
    }
    setEditingId(null);
    setEditValue('');
  };

  const handleCancelEdit = (conversationId: string) => {
    const currentTitle = filteredConversations.find(
      (c) => c.id === conversationId,
    )?.title;
    setEditValue(currentTitle || '');
    setEditingId(null);
  };

  const handleEditBlur = (conversationId: string) => {
    // Only save on blur if we're still in edit mode (not cancelled)
    // Don't save immediately after entering edit mode (prevents dropdown close from triggering save)
    if (editingId === conversationId && !justEnteredEditModeRef.current) {
      handleSaveEdit(conversationId);
    }
  };

  const handleEditKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    conversationId: string,
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveEdit(conversationId);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEdit(conversationId);
    }
  };

  const handleBookmark = (conversationId: string) => {
    const newBookmarkedIds = new Set(bookmarkedIds);
    if (newBookmarkedIds.has(conversationId)) {
      newBookmarkedIds.delete(conversationId);
    } else {
      newBookmarkedIds.add(conversationId);
    }
    setBookmarkedIds(newBookmarkedIds);
    localStorage.setItem(
      'bookmarked-conversations',
      JSON.stringify(Array.from(newBookmarkedIds)),
    );
    onConversationBookmark?.(conversationId);
  };

  const handleDeleteClick = (conversationId: string) => {
    setConversationToDelete(conversationId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (conversationToDelete) {
      onConversationDelete?.(conversationToDelete);
      setDeleteDialogOpen(false);
      setConversationToDelete(null);
    }
  };

  useEffect(() => {
    if (editingId && editInputRef.current) {
      justEnteredEditModeRef.current = true;
      // Use requestAnimationFrame and setTimeout to ensure dropdown has closed and DOM is ready
      requestAnimationFrame(() => {
        setTimeout(() => {
          editInputRef.current?.focus();
          editInputRef.current?.select();
          // Reset the flag after a delay to allow blur to work normally
          setTimeout(() => {
            justEnteredEditModeRef.current = false;
          }, 200);
        }, 100);
      });
    }
  }, [editingId]);

  // Detect title changes and trigger animation
  useEffect(() => {
    filteredConversations.forEach((conversation) => {
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
  }, [filteredConversations]);

  const hasConversations =
    filteredConversations.length > 0 || currentConversation !== null;

  if (isLoading) {
    return (
      <SidebarGroup className="overflow-hidden min-w-0">
        <Collapsible open={isRecentsOpen} onOpenChange={setIsRecentsOpen}>
          <CollapsibleTrigger asChild>
            <SidebarGroupLabel className="cursor-pointer hover:bg-sidebar-accent rounded-md px-2 py-1.5 my-2 -mx-2">
              <div className="flex items-center justify-between w-full">
                <span>Recent chats</span>
                <ChevronRight
                  className={cn(
                    'size-4 transition-transform duration-200',
                    isRecentsOpen && 'rotate-90',
                  )}
                />
              </div>
            </SidebarGroupLabel>
          </CollapsibleTrigger>
          <CollapsibleContent className="overflow-hidden">
            <SidebarGroupContent>
              <LoadingSkeleton variant="sidebar" count={5} />
            </SidebarGroupContent>
          </CollapsibleContent>
        </Collapsible>
      </SidebarGroup>
    );
  }

  return (
    <>
      <SidebarGroup className="overflow-hidden min-w-0">
        <Collapsible open={isRecentsOpen} onOpenChange={setIsRecentsOpen}>
          <CollapsibleTrigger asChild>
            <SidebarGroupLabel className="cursor-pointer hover:bg-sidebar-accent rounded-md px-2 py-1.5 my-2 -mx-2">
              <div className="flex items-center justify-between w-full">
                <span>Recent chats</span>
                <ChevronRight
                  className={cn(
                    'size-4 transition-transform duration-200',
                    isRecentsOpen && 'rotate-90',
                  )}
                />
              </div>
            </SidebarGroupLabel>
          </CollapsibleTrigger>
          <CollapsibleContent className="overflow-hidden">
            <SidebarGroupContent className="overflow-hidden relative">
          {!hasConversations ? (
            <SidebarMenu>
              <SidebarMenuItem>
                <div className="text-muted-foreground flex flex-col items-center gap-2 px-2 py-8 text-center text-sm">
                  <div>
                    <p className="font-medium">No chats found</p>
                    <p className="text-xs">Start a new chat to get started</p>
                  </div>
                </div>
              </SidebarMenuItem>
            </SidebarMenu>
          ) : (
            <div className="relative">
              {/* Fade effect at bottom */}
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-sidebar to-transparent z-10" />
              
              <SidebarMenu className="pb-12">
              {/* Current Conversation - Always on top */}
              {currentConversation && (
                <SidebarMenuItem>
                  <ContextMenu>
                    <ContextMenuTrigger asChild>
                      <div className="w-full">
                        <SidebarMenuButton
                          asChild
                          isActive={true}
                          tooltip={currentConversation.title}
                        >
                          <Link
                            to={createPath(
                              pathsConfig.app.conversation,
                              currentConversation.slug,
                            )}
                            className="group flex items-center gap-2 w-full min-w-0"
                          >
                            <MessageCircle className="size-4 shrink-0" />
                            {editingId === currentConversation.id ? (
                            <div className="flex min-w-0 flex-1 items-center gap-1.5">
                              <Input
                                ref={editInputRef}
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => handleEditBlur(currentConversation.id)}
                                onKeyDown={(e) => handleEditKeyDown(e, currentConversation.id)}
                                onClick={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                                className="flex-1 h-auto border-0 bg-transparent px-2 py-0 text-sm font-medium focus-visible:ring-0 shadow-none"
                                placeholder="Chat title..."
                                maxLength={100}
                              />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCancelEdit(currentConversation.id);
                                }}
                                onMouseDown={(e) => e.stopPropagation()}
                                className="text-muted-foreground hover:text-foreground hover:bg-accent shrink-0 rounded p-1 transition-colors"
                                aria-label="Discard changes"
                              >
                                <X className="size-3.5" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <span
                                className={cn(
                                  'truncate text-sm font-medium transition-all duration-300 flex-1 min-w-0',
                                  animatingIds.has(currentConversation.id) &&
                                    'animate-in fade-in-0 slide-in-from-left-2',
                                )}
                                title={currentConversation.title}
                              >
                                {truncateChatTitle(currentConversation.title)}
                              </span>
                              <div className="relative shrink-0">
                                {processingConversationSlug ===
                                currentConversation.slug ? (
                                  <div className="size-2 shrink-0 animate-pulse rounded-full bg-yellow-500 shadow-sm shadow-yellow-500/50 group-hover:opacity-0 transition-opacity absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                                ) : (
                                  <div className="bg-primary size-1.5 shrink-0 rounded-full group-hover:opacity-0 transition-opacity absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                                )}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button
                                      onClick={(e) => e.stopPropagation()}
                                      className="text-muted-foreground hover:text-foreground hover:bg-accent shrink-0 rounded p-1 opacity-0 transition-all group-hover:opacity-100 cursor-pointer"
                                    >
                                      <MoreHorizontal className="size-4" />
                                    </button>
                                  </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStartEdit(
                                        currentConversation.id,
                                        currentConversation.title,
                                      );
                                    }}
                                  >
                                    <Pencil className="mr-2 size-4" />
                                    Rename
                                  </DropdownMenuItem>
                                          <DropdownMenuItem
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleBookmark(currentConversation.id);
                                            }}
                                            disabled
                                            className="opacity-50 cursor-not-allowed"
                                          >
                                            <Bookmark
                                              className={cn(
                                                'mr-2 size-4',
                                                bookmarkedIds.has(currentConversation.id) &&
                                                  'fill-current',
                                              )}
                                            />
                                            {bookmarkedIds.has(currentConversation.id)
                                              ? 'Unpin'
                                              : 'Pin chat'}
                                          </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                          <DropdownMenuItem
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDeleteClick(currentConversation.id);
                                            }}
                                            className="text-destructive focus:text-destructive"
                                          >
                                            <Trash2 className="mr-2 size-4" />
                                            Delete
                                          </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                              </div>
                            </>
                          )}
                          </Link>
                        </SidebarMenuButton>
                      </div>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem
                        onClick={() =>
                          handleStartEdit(
                            currentConversation.id,
                            currentConversation.title,
                          )
                        }
                      >
                        <Pencil className="mr-2 size-4" />
                        Rename
                      </ContextMenuItem>
                      {onConversationBookmark && (
                        <ContextMenuItem
                          onClick={() =>
                            onConversationBookmark(currentConversation.id)
                          }
                        >
                          <Bookmark className="mr-2 size-4" />
                          Bookmark
                        </ContextMenuItem>
                      )}
                      {onConversationDuplicate && (
                        <ContextMenuItem
                          onClick={() =>
                            onConversationDuplicate(currentConversation.id)
                          }
                        >
                          <Copy className="mr-2 size-4" />
                          Duplicate
                        </ContextMenuItem>
                      )}
                      {onConversationShare && (
                        <ContextMenuItem
                          onClick={() =>
                            onConversationShare(currentConversation.id)
                          }
                        >
                          <Share2 className="mr-2 size-4" />
                          Share
                        </ContextMenuItem>
                      )}
                      <ContextMenuSeparator />
                        <ContextMenuItem
                          onClick={() => handleDeleteClick(currentConversation.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 size-4" />
                          Delete
                        </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                </SidebarMenuItem>
              )}

              {/* Other Conversations - Flat list */}
              {limitedConversations.map((conversation) => {
                const isEditing = editingId === conversation.id;
                const conversationPath = createPath(
                  pathsConfig.app.conversation,
                  conversation.slug,
                );

                return (
                  <SidebarMenuItem key={conversation.id}>
                    <ContextMenu>
                      <ContextMenuTrigger asChild>
                        <div className="w-full">
                          <SidebarMenuButton
                            asChild
                            tooltip={conversation.title}
                          >
                            <Link
                              to={conversationPath}
                              className="group flex items-center gap-2 w-full min-w-0"
                            >
                              <MessageCircle className="size-4 shrink-0" />
                              {isEditing ? (
                                <div className="flex min-w-0 flex-1 items-center gap-1.5">
                                  <Input
                                    ref={editInputRef}
                                    type="text"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onBlur={() => handleEditBlur(conversation.id)}
                                    onKeyDown={(e) => handleEditKeyDown(e, conversation.id)}
                                    onClick={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    className="flex-1 h-auto border-0 bg-transparent px-2 py-0 text-sm font-medium focus-visible:ring-0 shadow-none"
                                    placeholder="Chat title..."
                                    maxLength={100}
                                  />
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCancelEdit(conversation.id);
                                    }}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    className="text-muted-foreground hover:text-foreground hover:bg-accent shrink-0 rounded p-1 transition-colors"
                                    aria-label="Discard changes"
                                  >
                                    <X className="size-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <span
                                    className={cn(
                                      'truncate text-sm font-medium transition-all duration-300 flex-1 min-w-0',
                                      animatingIds.has(conversation.id) &&
                                        'animate-in fade-in-0 slide-in-from-left-2',
                                    )}
                                    title={conversation.title}
                                  >
                                    {truncateChatTitle(conversation.title)}
                                  </span>
                                  <div className="relative shrink-0">
                                    {processingConversationSlug ===
                                    conversation.slug ? (
                                      <div className="size-2 shrink-0 animate-pulse rounded-full bg-yellow-500 shadow-sm shadow-yellow-500/50 group-hover:opacity-0 transition-opacity absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                                    ) : null}
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <button
                                          onClick={(e) => e.stopPropagation()}
                                          className="text-muted-foreground hover:text-foreground hover:bg-accent shrink-0 rounded p-1 opacity-0 transition-all group-hover:opacity-100 cursor-pointer"
                                        >
                                          <MoreHorizontal className="size-4" />
                                        </button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleStartEdit(
                                              conversation.id,
                                              conversation.title,
                                            );
                                          }}
                                        >
                                          <Pencil className="mr-2 size-4" />
                                          Rename
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleBookmark(conversation.id);
                                          }}
                                          disabled
                                          className="opacity-50 cursor-not-allowed"
                                        >
                                          <Bookmark
                                            className={cn(
                                              'mr-2 size-4',
                                              bookmarkedIds.has(conversation.id) &&
                                                'fill-current',
                                            )}
                                          />
                                          {bookmarkedIds.has(conversation.id)
                                            ? 'Unpin'
                                            : 'Pin chat'}
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteClick(conversation.id);
                                          }}
                                          className="text-destructive focus:text-destructive"
                                        >
                                          <Trash2 className="mr-2 size-4" />
                                          Delete
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </>
                              )}
                            </Link>
                          </SidebarMenuButton>
                        </div>
                      </ContextMenuTrigger>
                      <ContextMenuContent>
                        <ContextMenuItem
                          onClick={() =>
                            handleStartEdit(
                              conversation.id,
                              conversation.title,
                            )
                          }
                        >
                          <Pencil className="mr-2 size-4" />
                          Rename
                        </ContextMenuItem>
                        {onConversationBookmark && (
                          <ContextMenuItem
                            onClick={() =>
                              onConversationBookmark(conversation.id)
                            }
                          >
                            <Bookmark className="mr-2 size-4" />
                            Bookmark
                          </ContextMenuItem>
                        )}
                        {onConversationDuplicate && (
                          <ContextMenuItem
                            onClick={() =>
                              onConversationDuplicate(conversation.id)
                            }
                          >
                            <Copy className="mr-2 size-4" />
                            Duplicate
                          </ContextMenuItem>
                        )}
                        {onConversationShare && (
                          <ContextMenuItem
                            onClick={() =>
                              onConversationShare(conversation.id)
                            }
                          >
                            <Share2 className="mr-2 size-4" />
                            Share
                          </ContextMenuItem>
                        )}
                        <ContextMenuSeparator />
                        <ContextMenuItem
                          onClick={() => handleDeleteClick(conversation.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 size-4" />
                          Delete
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  </SidebarMenuItem>
                );
              })}
              </SidebarMenu>
              
              {/* View all chats button */}
              {projectSlug && (
                <div className="absolute bottom-0 left-0 right-0 z-20 px-2 pb-2 pt-4">
                  <Link
                    to={createPath(pathsConfig.app.projectConversation, projectSlug)}
                    className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
                  >
                    <span>View all chats</span>
                    <ArrowRight className="size-4 shrink-0" />
                  </Link>
                </div>
              )}
            </div>
          )}
            </SidebarGroupContent>
          </CollapsibleContent>
        </Collapsible>
      </SidebarGroup>

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        itemName="chat"
        itemCount={1}
        description={
          conversationToDelete
            ? `Are you sure you want to delete this chat? This action cannot be undone and will permanently remove the conversation and all its messages.`
            : undefined
        }
      />
    </>
  );
}

