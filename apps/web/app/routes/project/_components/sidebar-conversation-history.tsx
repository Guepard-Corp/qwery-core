'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Trans } from '@qwery/ui/trans';
import {
  Pencil,
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
import { Input } from '@qwery/ui/input';
import { createPath } from '~/config/paths.config';
import pathsConfig from '~/config/paths.config';
import { type Conversation, ConfirmDeleteDialog } from '@qwery/ui/ai';
import { LoadingSkeleton } from '@qwery/ui/loading-skeleton';
import { useProject } from '~/lib/context/project-context';

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
  isProcessing: _isProcessing = false,
  processingConversationSlug,
  searchQuery = '',
  onConversationSelect: _onConversationSelect,
  onConversationEdit,
  onConversationDelete,
  onConversationDuplicate,
  onConversationShare,
  onConversationBookmark,
}: SidebarConversationHistoryProps) {
  const { t } = useTranslation('common');
  const location = useLocation();
  const { projectSlug } = useProject();

  // Get current conversation slug directly from URL for reliable active state
  const conversationSlugMatch = location.pathname.match(/\/c\/([^/]+)$/);
  const currentSlugFromUrl = conversationSlugMatch?.[1];

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
  const [conversationToDelete, setConversationToDelete] = useState<
    string | null
  >(null);

  const [selectionOrderMap, setSelectionOrderMap] = useState<
    Map<string, number>
  >(() => {
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
      setTimeout(() => {
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
      }, 0);
    }
  }, [currentConversationId]);

  // Filter conversations by search query and sort by bookmarked first, then createdAt (newest first)
  const filteredConversations = useMemo(() => {
    let filtered = conversations;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = conversations.filter((conv) =>
        conv.title.toLowerCase().includes(query),
      );
    }
    // Sort: bookmarked first, then by createdAt (newest first)
    return [...filtered].sort((a, b) => {
      const aBookmarked = bookmarkedIds.has(a.id);
      const bBookmarked = bookmarkedIds.has(b.id);
      if (aBookmarked && !bBookmarked) return -1;
      if (!aBookmarked && bBookmarked) return 1;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }, [conversations, searchQuery, bookmarkedIds]);

  // Get current conversation separately using URL slug for reliable matching
  const currentConversation = useMemo(() => {
    if (!currentSlugFromUrl) return null;
    return (
      filteredConversations.find((c) => c.slug === currentSlugFromUrl) || null
    );
  }, [filteredConversations, currentSlugFromUrl]);

  // Sort conversations by selection order: current first, then by selection timestamp, then by createdAt
  const otherConversations = useMemo(() => {
    const others = filteredConversations.filter(
      (c) => c.slug !== currentSlugFromUrl,
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
      // Neither has timestamp: sort by createdAt (newest first)
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }, [filteredConversations, currentSlugFromUrl, selectionOrderMap]);

  const MAX_SIDEBAR_CHATS = 6;
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
      <SidebarGroup className="min-w-0 overflow-hidden py-0">
        <Collapsible open={isRecentsOpen} onOpenChange={setIsRecentsOpen}>
          <CollapsibleTrigger asChild>
            <SidebarGroupLabel className="hover:bg-sidebar-accent -mx-2 cursor-pointer rounded-md px-2 py-1">
              <div className="flex w-full items-center justify-between">
                <Trans i18nKey="common:sidebar.recentChats" />
                <ChevronRight
                  className={cn(
                    'size-4 transition-transform duration-200',
                    isRecentsOpen && 'rotate-90',
                  )}
                />
              </div>
            </SidebarGroupLabel>
          </CollapsibleTrigger>
          <CollapsibleContent className="data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down overflow-hidden data-[state=closed]:duration-200 data-[state=open]:duration-200">
            <SidebarGroupContent className="min-h-0">
              <LoadingSkeleton variant="sidebar" count={5} />
            </SidebarGroupContent>
          </CollapsibleContent>
        </Collapsible>
      </SidebarGroup>
    );
  }

  return (
    <>
      <SidebarGroup className="min-w-0 overflow-hidden py-0">
        <Collapsible open={isRecentsOpen} onOpenChange={setIsRecentsOpen}>
          <CollapsibleTrigger asChild>
            <SidebarGroupLabel className="hover:bg-sidebar-accent -mx-2 cursor-pointer rounded-md px-2 py-1">
              <div className="flex w-full items-center justify-between">
                <Trans i18nKey="common:sidebar.recentChats" />
                <ChevronRight
                  className={cn(
                    'size-4 transition-transform duration-200',
                    isRecentsOpen && 'rotate-90',
                  )}
                />
              </div>
            </SidebarGroupLabel>
          </CollapsibleTrigger>
          <CollapsibleContent className="data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down overflow-hidden data-[state=closed]:duration-200 data-[state=open]:duration-200">
            <SidebarGroupContent className="relative min-h-0 overflow-hidden">
              {!hasConversations ? (
                <SidebarMenu>
                  <SidebarMenuItem>
                    <div className="text-muted-foreground flex flex-col items-center gap-2 px-2 py-8 text-center text-sm">
                      <div>
                        <p className="font-medium">
                          <Trans i18nKey="common:sidebar.noChatsFound" />
                        </p>
                        <p className="text-xs">{t('sidebar.startNewChat')}</p>
                      </div>
                    </div>
                  </SidebarMenuItem>
                </SidebarMenu>
              ) : (
                <div className="relative">
                  {/* Fade effect at bottom */}
                  <div className="from-sidebar pointer-events-none absolute right-0 bottom-0 left-0 z-10 h-12 bg-gradient-to-t to-transparent" />

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
                                  className="group flex w-full min-w-0 items-center gap-2"
                                >
                                  {editingId === currentConversation.id ? (
                                    <div className="flex min-w-0 flex-1 items-center gap-1.5">
                                      <Input
                                        ref={editInputRef}
                                        type="text"
                                        value={editValue}
                                        onChange={(e) =>
                                          setEditValue(e.target.value)
                                        }
                                        onBlur={() =>
                                          handleEditBlur(currentConversation.id)
                                        }
                                        onKeyDown={(e) =>
                                          handleEditKeyDown(
                                            e,
                                            currentConversation.id,
                                          )
                                        }
                                        onClick={(e) => e.stopPropagation()}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        className="h-auto flex-1 border-0 bg-transparent px-2 py-0 text-sm font-medium shadow-none focus-visible:ring-0"
                                        placeholder={t(
                                          'sidebar.chatTitlePlaceholder',
                                        )}
                                        maxLength={100}
                                      />
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCancelEdit(
                                            currentConversation.id,
                                          );
                                        }}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        className="text-muted-foreground hover:text-foreground hover:bg-accent shrink-0 rounded p-1 transition-colors"
                                        aria-label={t('sidebar.discardChanges')}
                                      >
                                        <X className="size-3.5" />
                                      </button>
                                    </div>
                                  ) : (
                                    <>
                                      <span
                                        className={cn(
                                          'min-w-0 flex-1 truncate text-sm font-medium transition-all duration-300',
                                          animatingIds.has(
                                            currentConversation.id,
                                          ) &&
                                            'animate-in fade-in-0 slide-in-from-left-2',
                                        )}
                                        title={currentConversation.title}
                                      >
                                        {truncateChatTitle(
                                          currentConversation.title,
                                        )}
                                      </span>
                                      <div className="relative shrink-0">
                                        {processingConversationSlug ===
                                        currentConversation.slug ? (
                                          <div className="absolute top-1/2 left-1/2 size-2 shrink-0 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-yellow-500 shadow-sm shadow-yellow-500/50 transition-opacity group-hover:opacity-0" />
                                        ) : (
                                          <div className="bg-primary absolute top-1/2 left-1/2 size-1.5 shrink-0 -translate-x-1/2 -translate-y-1/2 rounded-full transition-opacity group-hover:opacity-0" />
                                        )}
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <button
                                              onClick={(e) =>
                                                e.stopPropagation()
                                              }
                                              className="text-muted-foreground hover:text-foreground hover:bg-accent shrink-0 cursor-pointer rounded p-1 opacity-0 transition-all group-hover:opacity-100"
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
                                              <Trans i18nKey="common:sidebar.rename" />
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleBookmark(
                                                  currentConversation.id,
                                                );
                                              }}
                                              disabled
                                              className="cursor-not-allowed opacity-50"
                                            >
                                              <Bookmark
                                                className={cn(
                                                  'mr-2 size-4',
                                                  bookmarkedIds.has(
                                                    currentConversation.id,
                                                  ) && 'fill-current',
                                                )}
                                              />
                                              {bookmarkedIds.has(
                                                currentConversation.id,
                                              ) ? (
                                                <Trans i18nKey="common:sidebar.unpin" />
                                              ) : (
                                                <Trans i18nKey="common:sidebar.pinChat" />
                                              )}
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteClick(
                                                  currentConversation.id,
                                                );
                                              }}
                                              className="text-destructive focus:text-destructive"
                                            >
                                              <Trash2 className="mr-2 size-4" />
                                              <Trans i18nKey="common:sidebar.delete" />
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
                              <Trans i18nKey="common:sidebar.rename" />
                            </ContextMenuItem>
                            {onConversationBookmark && (
                              <ContextMenuItem
                                onClick={() =>
                                  onConversationBookmark(currentConversation.id)
                                }
                              >
                                <Bookmark className="mr-2 size-4" />
                                <Trans i18nKey="common:sidebar.bookmark" />
                              </ContextMenuItem>
                            )}
                            {onConversationDuplicate && (
                              <ContextMenuItem
                                onClick={() =>
                                  onConversationDuplicate(
                                    currentConversation.id,
                                  )
                                }
                              >
                                <Copy className="mr-2 size-4" />
                                <Trans i18nKey="common:sidebar.duplicate" />
                              </ContextMenuItem>
                            )}
                            {onConversationShare && (
                              <ContextMenuItem
                                onClick={() =>
                                  onConversationShare(currentConversation.id)
                                }
                              >
                                <Share2 className="mr-2 size-4" />
                                <Trans i18nKey="common:sidebar.share" />
                              </ContextMenuItem>
                            )}
                            <ContextMenuSeparator />
                            <ContextMenuItem
                              onClick={() =>
                                handleDeleteClick(currentConversation.id)
                              }
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 size-4" />
                              <Trans i18nKey="common:sidebar.delete" />
                            </ContextMenuItem>
                          </ContextMenuContent>
                        </ContextMenu>
                      </SidebarMenuItem>
                    )}

                    {/* Other Conversations - Flat list */}
                    {limitedConversations.map((conversation) => {
                      const isEditing = editingId === conversation.id;
                      const isActive = conversation.slug === currentSlugFromUrl;
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
                                  isActive={isActive}
                                  tooltip={conversation.title}
                                >
                                  <Link
                                    to={conversationPath}
                                    className="group flex w-full min-w-0 items-center gap-2"
                                  >
                                    {isEditing ? (
                                      <div className="flex min-w-0 flex-1 items-center gap-1.5">
                                        <Input
                                          ref={editInputRef}
                                          type="text"
                                          value={editValue}
                                          onChange={(e) =>
                                            setEditValue(e.target.value)
                                          }
                                          onBlur={() =>
                                            handleEditBlur(conversation.id)
                                          }
                                          onKeyDown={(e) =>
                                            handleEditKeyDown(
                                              e,
                                              conversation.id,
                                            )
                                          }
                                          onClick={(e) => e.stopPropagation()}
                                          onMouseDown={(e) =>
                                            e.stopPropagation()
                                          }
                                          className="h-auto flex-1 border-0 bg-transparent px-2 py-0 text-sm font-medium shadow-none focus-visible:ring-0"
                                          placeholder={t(
                                            'sidebar.chatTitlePlaceholder',
                                          )}
                                          maxLength={100}
                                        />
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleCancelEdit(conversation.id);
                                          }}
                                          onMouseDown={(e) =>
                                            e.stopPropagation()
                                          }
                                          className="text-muted-foreground hover:text-foreground hover:bg-accent shrink-0 rounded p-1 transition-colors"
                                          aria-label={t(
                                            'sidebar.discardChanges',
                                          )}
                                        >
                                          <X className="size-3.5" />
                                        </button>
                                      </div>
                                    ) : (
                                      <>
                                        <span
                                          className={cn(
                                            'min-w-0 flex-1 truncate text-sm font-medium transition-all duration-300',
                                            animatingIds.has(conversation.id) &&
                                              'animate-in fade-in-0 slide-in-from-left-2',
                                          )}
                                          title={conversation.title}
                                        >
                                          {truncateChatTitle(
                                            conversation.title,
                                          )}
                                        </span>
                                        <div className="relative shrink-0">
                                          {processingConversationSlug ===
                                          conversation.slug ? (
                                            <div className="absolute top-1/2 left-1/2 size-2 shrink-0 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-yellow-500 shadow-sm shadow-yellow-500/50 transition-opacity group-hover:opacity-0" />
                                          ) : null}
                                          <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                              <button
                                                onClick={(e) =>
                                                  e.stopPropagation()
                                                }
                                                className="text-muted-foreground hover:text-foreground hover:bg-accent shrink-0 cursor-pointer rounded p-1 opacity-0 transition-all group-hover:opacity-100"
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
                                                <Trans i18nKey="common:sidebar.rename" />
                                              </DropdownMenuItem>
                                              <DropdownMenuItem
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleBookmark(
                                                    conversation.id,
                                                  );
                                                }}
                                                disabled
                                                className="cursor-not-allowed opacity-50"
                                              >
                                                <Bookmark
                                                  className={cn(
                                                    'mr-2 size-4',
                                                    bookmarkedIds.has(
                                                      conversation.id,
                                                    ) && 'fill-current',
                                                  )}
                                                />
                                                {bookmarkedIds.has(
                                                  conversation.id,
                                                ) ? (
                                                  <Trans i18nKey="common:sidebar.unpin" />
                                                ) : (
                                                  <Trans i18nKey="common:sidebar.pinChat" />
                                                )}
                                              </DropdownMenuItem>
                                              <DropdownMenuSeparator />
                                              <DropdownMenuItem
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleDeleteClick(
                                                    conversation.id,
                                                  );
                                                }}
                                                className="text-destructive focus:text-destructive"
                                              >
                                                <Trash2 className="mr-2 size-4" />
                                                <Trans i18nKey="common:sidebar.delete" />
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
                                <Trans i18nKey="common:sidebar.rename" />
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
                                onClick={() =>
                                  handleDeleteClick(conversation.id)
                                }
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 size-4" />
                                <Trans i18nKey="common:sidebar.delete" />
                              </ContextMenuItem>
                            </ContextMenuContent>
                          </ContextMenu>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>

                  {/* View all chats button */}
                  {projectSlug && (
                    <div className="absolute right-0 bottom-0 left-0 z-20 mt-6 px-2 pt-6 pb-2">
                      <Link
                        to={createPath(
                          pathsConfig.app.projectConversation,
                          projectSlug,
                        )}
                        className="group bg-sidebar-accent/50 hover:bg-sidebar-accent border-border/40 hover:border-border/60 text-muted-foreground hover:text-foreground flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm font-medium backdrop-blur-sm transition-all duration-200"
                      >
                        <Trans i18nKey="common:sidebar.viewAllChats" />
                        <ArrowRight className="size-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
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
          conversationToDelete ? (
            <Trans i18nKey="common:sidebar.deleteChatConfirmation" />
          ) : undefined
        }
      />
    </>
  );
}

export interface SidebarNotebookHistoryProps {
  notebooks?: Array<{
    id: string;
    title: string;
    slug: string;
    updatedAt: Date;
  }>;
  isLoading?: boolean;
  currentNotebookSlug?: string;
  searchQuery?: string;
  onNotebookSelect?: (notebookSlug: string) => void;
  onNotebookDelete?: (notebookId: string) => void;
}

export function SidebarNotebookHistory({
  notebooks = [],
  isLoading = false,
  currentNotebookSlug,
  searchQuery = '',
  onNotebookSelect: _onNotebookSelect,
  onNotebookDelete,
}: SidebarNotebookHistoryProps) {
  const { t } = useTranslation('common');
  const location = useLocation();
  const { projectSlug } = useProject();

  const notebookSlugMatch = location.pathname.match(/\/notebooks\/([^/]+)$/);
  const currentSlugFromUrl = notebookSlugMatch?.[1];

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [animatingIds, setAnimatingIds] = useState<Set<string>>(new Set());
  const [isRecentsOpen, setIsRecentsOpen] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [notebookToDelete, setNotebookToDelete] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const previousTitlesRef = useRef<Map<string, string>>(new Map());

  const filteredNotebooks = useMemo(() => {
    let filtered = notebooks;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = notebooks.filter((notebook) =>
        notebook.title.toLowerCase().includes(query),
      );
    }
    return [...filtered].sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
    );
  }, [notebooks, searchQuery]);

  const activeNotebookSlug = currentSlugFromUrl || currentNotebookSlug;

  const currentNotebook = useMemo(
    () =>
      activeNotebookSlug
        ? filteredNotebooks.find((n) => n.slug === activeNotebookSlug)
        : null,
    [filteredNotebooks, activeNotebookSlug],
  );

  const otherNotebooks = useMemo(
    () => filteredNotebooks.filter((n) => n.slug !== activeNotebookSlug),
    [filteredNotebooks, activeNotebookSlug],
  );

  const MAX_SIDEBAR_NOTEBOOKS = 5;
  const limitedNotebooks = useMemo(
    () => otherNotebooks.slice(0, MAX_SIDEBAR_NOTEBOOKS),
    [otherNotebooks],
  );

  const hasNotebooks = filteredNotebooks.length > 0 || currentNotebook !== null;

  const handleStartEdit = (notebookId: string, currentTitle: string) => {
    setEditingId(notebookId);
    setEditValue(currentTitle);
  };

  const handleEditBlur = (notebookId: string) => {
    if (editingId === notebookId) {
      setEditingId(null);
      setEditValue('');
    }
  };

  const handleEditKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    notebookId: string,
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (
        editValue.trim() &&
        editValue.trim() !== notebooks.find((n) => n.id === notebookId)?.title
      ) {
        // Handle edit - would need onNotebookEdit prop
      }
      setEditingId(null);
      setEditValue('');
    } else if (e.key === 'Escape') {
      setEditingId(null);
      setEditValue('');
    }
  };

  const handleCancelEdit = (_notebookId: string) => {
    setEditingId(null);
    setEditValue('');
  };

  const handleDeleteClick = (notebookId: string) => {
    setNotebookToDelete(notebookId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (notebookToDelete && onNotebookDelete) {
      onNotebookDelete(notebookToDelete);
    }
    setDeleteDialogOpen(false);
    setNotebookToDelete(null);
  };

  useEffect(() => {
    if (editingId && editInputRef.current) {
      setTimeout(() => {
        editInputRef.current?.focus();
        editInputRef.current?.select();
      }, 0);
    }
  }, [editingId]);

  useEffect(() => {
    filteredNotebooks.forEach((notebook) => {
      const previousTitle = previousTitlesRef.current.get(notebook.id);
      const currentTitle = notebook.title;

      if (previousTitle && previousTitle !== currentTitle) {
        setAnimatingIds((prev) => new Set(prev).add(notebook.id));
        setTimeout(() => {
          setAnimatingIds((prev) => {
            const next = new Set(prev);
            next.delete(notebook.id);
            return next;
          });
        }, 1000);
      }

      previousTitlesRef.current.set(notebook.id, currentTitle);
    });
  }, [filteredNotebooks]);

  if (isLoading) {
    return (
      <SidebarGroup className="min-w-0 overflow-hidden py-0">
        <Collapsible open={isRecentsOpen} onOpenChange={setIsRecentsOpen}>
          <CollapsibleTrigger asChild>
            <SidebarGroupLabel className="hover:bg-sidebar-accent -mx-2 cursor-pointer rounded-md px-2 py-1">
              <div className="flex w-full items-center justify-between">
                <Trans i18nKey="common:sidebar.recentNotebooks" />
                <ChevronRight
                  className={cn(
                    'size-4 transition-transform duration-200',
                    isRecentsOpen && 'rotate-90',
                  )}
                />
              </div>
            </SidebarGroupLabel>
          </CollapsibleTrigger>
          <CollapsibleContent className="data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down overflow-hidden">
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
      <SidebarGroup className="min-w-0 overflow-hidden py-0">
        <Collapsible open={isRecentsOpen} onOpenChange={setIsRecentsOpen}>
          <CollapsibleTrigger asChild>
            <SidebarGroupLabel className="hover:bg-sidebar-accent -mx-2 cursor-pointer rounded-md px-2 py-1">
              <div className="flex w-full items-center justify-between">
                <Trans i18nKey="common:sidebar.recentNotebooks" />
                <ChevronRight
                  className={cn(
                    'size-4 transition-transform duration-200',
                    isRecentsOpen && 'rotate-90',
                  )}
                />
              </div>
            </SidebarGroupLabel>
          </CollapsibleTrigger>
          <CollapsibleContent className="data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down overflow-hidden data-[state=closed]:duration-200 data-[state=open]:duration-200">
            <SidebarGroupContent className="relative min-h-0 overflow-hidden">
              {!hasNotebooks ? (
                <SidebarMenu>
                  <SidebarMenuItem>
                    <div className="text-muted-foreground flex flex-col items-center gap-2 px-2 py-8 text-center text-sm">
                      <div>
                        <p className="font-medium">
                          <Trans i18nKey="common:sidebar.noNotebooksFound" />
                        </p>
                        <p className="text-xs">
                          {t('sidebar.createNewNotebook')}
                        </p>
                      </div>
                    </div>
                  </SidebarMenuItem>
                </SidebarMenu>
              ) : (
                <div className="relative">
                  <div className="from-sidebar pointer-events-none absolute right-0 bottom-0 left-0 z-10 h-12 bg-gradient-to-t to-transparent" />

                  <SidebarMenu className="pb-12">
                    {currentNotebook && (
                      <SidebarMenuItem>
                        <ContextMenu>
                          <ContextMenuTrigger asChild>
                            <div className="w-full">
                              <SidebarMenuButton
                                asChild
                                isActive={true}
                                tooltip={currentNotebook.title}
                              >
                                <Link
                                  to={createPath(
                                    pathsConfig.app.projectNotebook,
                                    currentNotebook.slug,
                                  )}
                                  className="group flex w-full min-w-0 items-center gap-2"
                                >
                                  {editingId === currentNotebook.id ? (
                                    <div className="flex min-w-0 flex-1 items-center gap-1.5">
                                      <Input
                                        ref={editInputRef}
                                        type="text"
                                        value={editValue}
                                        onChange={(e) =>
                                          setEditValue(e.target.value)
                                        }
                                        onBlur={() =>
                                          handleEditBlur(currentNotebook.id)
                                        }
                                        onKeyDown={(e) =>
                                          handleEditKeyDown(
                                            e,
                                            currentNotebook.id,
                                          )
                                        }
                                        onClick={(e) => e.stopPropagation()}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        className="h-auto flex-1 border-0 bg-transparent px-2 py-0 text-sm font-medium shadow-none focus-visible:ring-0"
                                        placeholder={t(
                                          'sidebar.notebookTitlePlaceholder',
                                        )}
                                        maxLength={100}
                                      />
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCancelEdit(currentNotebook.id);
                                        }}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        className="text-muted-foreground hover:text-foreground hover:bg-accent shrink-0 rounded p-1 transition-colors"
                                        aria-label={t('sidebar.discardChanges')}
                                      >
                                        <X className="size-3.5" />
                                      </button>
                                    </div>
                                  ) : (
                                    <>
                                      <span
                                        className={cn(
                                          'min-w-0 flex-1 truncate text-sm font-medium transition-all duration-300',
                                          animatingIds.has(
                                            currentNotebook.id,
                                          ) &&
                                            'animate-in fade-in-0 slide-in-from-left-2',
                                        )}
                                        title={currentNotebook.title}
                                      >
                                        {truncateChatTitle(
                                          currentNotebook.title,
                                        )}
                                      </span>
                                      <div className="relative shrink-0">
                                        <div className="bg-primary absolute top-1/2 left-1/2 size-1.5 shrink-0 -translate-x-1/2 -translate-y-1/2 rounded-full transition-opacity group-hover:opacity-0" />
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <button
                                              onClick={(e) =>
                                                e.stopPropagation()
                                              }
                                              className="text-muted-foreground hover:text-foreground hover:bg-accent shrink-0 cursor-pointer rounded p-1 opacity-0 transition-all group-hover:opacity-100"
                                            >
                                              <MoreHorizontal className="size-4" />
                                            </button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end">
                                            <DropdownMenuItem
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleStartEdit(
                                                  currentNotebook.id,
                                                  currentNotebook.title,
                                                );
                                              }}
                                            >
                                              <Pencil className="mr-2 size-4" />
                                              <Trans i18nKey="common:sidebar.rename" />
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteClick(
                                                  currentNotebook.id,
                                                );
                                              }}
                                              className="text-destructive focus:text-destructive"
                                            >
                                              <Trash2 className="mr-2 size-4" />
                                              <Trans i18nKey="common:sidebar.delete" />
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
                                  currentNotebook.id,
                                  currentNotebook.title,
                                )
                              }
                            >
                              <Pencil className="mr-2 size-4" />
                              <Trans i18nKey="common:sidebar.rename" />
                            </ContextMenuItem>
                            <ContextMenuSeparator />
                            <ContextMenuItem
                              onClick={() =>
                                handleDeleteClick(currentNotebook.id)
                              }
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 size-4" />
                              <Trans i18nKey="common:sidebar.delete" />
                            </ContextMenuItem>
                          </ContextMenuContent>
                        </ContextMenu>
                      </SidebarMenuItem>
                    )}

                    {limitedNotebooks.map((notebook) => {
                      const isEditing = editingId === notebook.id;
                      const isActive = notebook.slug === activeNotebookSlug;
                      const notebookPath = createPath(
                        pathsConfig.app.projectNotebook,
                        notebook.slug,
                      );

                      return (
                        <SidebarMenuItem key={notebook.id}>
                          <ContextMenu>
                            <ContextMenuTrigger asChild>
                              <div className="w-full">
                                <SidebarMenuButton
                                  asChild
                                  isActive={isActive}
                                  tooltip={notebook.title}
                                >
                                  <Link
                                    to={notebookPath}
                                    className="group flex w-full min-w-0 items-center gap-2"
                                  >
                                    {isEditing ? (
                                      <div className="flex min-w-0 flex-1 items-center gap-1.5">
                                        <Input
                                          ref={editInputRef}
                                          type="text"
                                          value={editValue}
                                          onChange={(e) =>
                                            setEditValue(e.target.value)
                                          }
                                          onBlur={() =>
                                            handleEditBlur(notebook.id)
                                          }
                                          onKeyDown={(e) =>
                                            handleEditKeyDown(e, notebook.id)
                                          }
                                          onClick={(e) => e.stopPropagation()}
                                          onMouseDown={(e) =>
                                            e.stopPropagation()
                                          }
                                          className="h-auto flex-1 border-0 bg-transparent px-2 py-0 text-sm font-medium shadow-none focus-visible:ring-0"
                                          placeholder={t(
                                            'sidebar.notebookTitlePlaceholder',
                                          )}
                                          maxLength={100}
                                        />
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleCancelEdit(notebook.id);
                                          }}
                                          onMouseDown={(e) =>
                                            e.stopPropagation()
                                          }
                                          className="text-muted-foreground hover:text-foreground hover:bg-accent shrink-0 rounded p-1 transition-colors"
                                          aria-label={t(
                                            'sidebar.discardChanges',
                                          )}
                                        >
                                          <X className="size-3.5" />
                                        </button>
                                      </div>
                                    ) : (
                                      <>
                                        <span
                                          className={cn(
                                            'min-w-0 flex-1 truncate text-sm font-medium transition-all duration-300',
                                            animatingIds.has(notebook.id) &&
                                              'animate-in fade-in-0 slide-in-from-left-2',
                                          )}
                                          title={notebook.title}
                                        >
                                          {truncateChatTitle(notebook.title)}
                                        </span>
                                        <div className="relative shrink-0">
                                          {isActive && (
                                            <div className="bg-primary absolute top-1/2 left-1/2 size-1.5 shrink-0 -translate-x-1/2 -translate-y-1/2 rounded-full transition-opacity group-hover:opacity-0" />
                                          )}
                                          <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                              <button
                                                onClick={(e) =>
                                                  e.stopPropagation()
                                                }
                                                className="text-muted-foreground hover:text-foreground hover:bg-accent shrink-0 cursor-pointer rounded p-1 opacity-0 transition-all group-hover:opacity-100"
                                              >
                                                <MoreHorizontal className="size-4" />
                                              </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                              <DropdownMenuItem
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleStartEdit(
                                                    notebook.id,
                                                    notebook.title,
                                                  );
                                                }}
                                              >
                                                <Pencil className="mr-2 size-4" />
                                                <Trans i18nKey="common:sidebar.rename" />
                                              </DropdownMenuItem>
                                              <DropdownMenuSeparator />
                                              <DropdownMenuItem
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleDeleteClick(
                                                    notebook.id,
                                                  );
                                                }}
                                                className="text-destructive focus:text-destructive"
                                              >
                                                <Trash2 className="mr-2 size-4" />
                                                <Trans i18nKey="common:sidebar.delete" />
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
                                  handleStartEdit(notebook.id, notebook.title)
                                }
                              >
                                <Pencil className="mr-2 size-4" />
                                <Trans i18nKey="common:sidebar.rename" />
                              </ContextMenuItem>
                              <ContextMenuSeparator />
                              <ContextMenuItem
                                onClick={() => handleDeleteClick(notebook.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 size-4" />
                                <Trans i18nKey="common:sidebar.delete" />
                              </ContextMenuItem>
                            </ContextMenuContent>
                          </ContextMenu>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>

                  {/* View all notebooks button */}
                  {projectSlug && (
                    <div className="absolute right-0 bottom-0 left-0 z-20 mt-6 px-2 pt-6 pb-2">
                      <Link
                        to={createPath(
                          pathsConfig.app.projectNotebooks,
                          projectSlug,
                        )}
                        className="group bg-sidebar-accent/50 hover:bg-sidebar-accent border-border/40 hover:border-border/60 text-muted-foreground hover:text-foreground flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm font-medium backdrop-blur-sm transition-all duration-200"
                      >
                        <Trans i18nKey="common:sidebar.viewAllNotebooks" />
                        <ArrowRight className="size-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
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
        itemName="notebook"
        itemCount={1}
        description={
          notebookToDelete ? (
            <Trans i18nKey="common:sidebar.deleteNotebookConfirmation" />
          ) : undefined
        }
      />
    </>
  );
}
