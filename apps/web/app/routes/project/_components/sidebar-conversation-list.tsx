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
  Pin,
} from 'lucide-react';
import { cn, truncateChatTitle } from '@qwery/ui/utils';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
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
import { ChevronRight } from 'lucide-react';
import { Input } from '@qwery/ui/input';
import { createPath } from '~/config/paths.config';
import pathsConfig from '~/config/paths.config';
import { type Conversation, ConfirmDeleteDialog } from '@qwery/ui/ai';
import { LoadingSkeleton } from '@qwery/ui/loading-skeleton';
import { useProject } from '~/lib/context/project-context';
import { useConversationListPrefsStore } from '~/lib/store/use-conversation-list-prefs';
import { formatTimeAgo } from './sidebar-utils';

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
  const { state: sidebarState } = useSidebar();

  const conversationSlugMatch = location.pathname.match(/\/c\/([^/]+)$/);
  const currentSlugFromUrl = conversationSlugMatch?.[1];

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [animatingIds, setAnimatingIds] = useState<Set<string>>(new Set());
  const [isRecentsOpen, setIsRecentsOpen] = useState(true);
  const initialOpenSetRef = useRef(false);
  const prevSidebarStateRef = useRef(sidebarState);

  useEffect(() => {
    if (!projectSlug) return;
    initialOpenSetRef.current = false;
  }, [projectSlug]);

  useEffect(() => {
    if (isLoading || initialOpenSetRef.current) return;
    initialOpenSetRef.current = true;
    const hasAny =
      conversations.length > 0 ||
      (currentConversationId &&
        conversations.some((c) => c.id === currentConversationId));
    setTimeout(() => {
      setIsRecentsOpen(!!hasAny);
    }, 0);
  }, [isLoading, conversations.length, currentConversationId, conversations]);

  useEffect(() => {
    if (
      prevSidebarStateRef.current === 'expanded' &&
      sidebarState === 'collapsed'
    ) {
      queueMicrotask(() => setIsRecentsOpen(false));
    }
    prevSidebarStateRef.current = sidebarState;
  }, [sidebarState]);

  const {
    bookmarkedIds,
    selectionOrder,
    toggleBookmark: storeToggleBookmark,
    touchSelectionOrder,
  } = useConversationListPrefsStore();
  const bookmarkedIdsSet = useMemo(
    () => new Set(bookmarkedIds),
    [bookmarkedIds],
  );
  const editInputRef = useRef<HTMLInputElement>(null);
  const previousTitlesRef = useRef<Map<string, string>>(new Map());
  const justEnteredEditModeRef = useRef(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<
    string | null
  >(null);

  const filteredConversations = useMemo(() => {
    let filtered = conversations;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = conversations.filter((conv) =>
        conv.title.toLowerCase().includes(query),
      );
    }
    return [...filtered].sort((a, b) => {
      const aBookmarked = bookmarkedIdsSet.has(a.id);
      const bBookmarked = bookmarkedIdsSet.has(b.id);
      if (aBookmarked && !bBookmarked) return -1;
      if (!aBookmarked && bBookmarked) return 1;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }, [conversations, searchQuery, bookmarkedIdsSet]);

  const currentConversation = useMemo(() => {
    if (!currentSlugFromUrl) return null;
    return (
      filteredConversations.find((c) => c.slug === currentSlugFromUrl) || null
    );
  }, [filteredConversations, currentSlugFromUrl]);

  const { pinnedConversations, unpinnedConversations } = useMemo(() => {
    const pinned = filteredConversations.filter((c) =>
      bookmarkedIdsSet.has(c.id),
    );
    const unpinned = filteredConversations.filter(
      (c) => !bookmarkedIdsSet.has(c.id),
    );
    const byUpdatedThenCreated = (
      a: (typeof filteredConversations)[0],
      b: (typeof filteredConversations)[0],
    ) => {
      const aTs = selectionOrder[a.id];
      const bTs = selectionOrder[b.id];
      if (aTs !== undefined && bTs !== undefined) return bTs - aTs;
      if (aTs !== undefined) return -1;
      if (bTs !== undefined) return 1;
      return b.createdAt.getTime() - a.createdAt.getTime();
    };
    return {
      pinnedConversations: [...pinned].sort(byUpdatedThenCreated),
      unpinnedConversations: [...unpinned].sort(byUpdatedThenCreated),
    };
  }, [filteredConversations, bookmarkedIdsSet, selectionOrder]);

  const MAX_SIDEBAR_CHATS = 6;
  const limitedPinnedConversations = useMemo(() => {
    const base = pinnedConversations.slice(0, MAX_SIDEBAR_CHATS);
    if (currentConversation && bookmarkedIdsSet.has(currentConversation.id)) {
      const alreadyIncluded = base.some(
        (conversation) => conversation.id === currentConversation.id,
      );
      if (!alreadyIncluded) {
        return [...base, currentConversation];
      }
    }
    return base;
  }, [pinnedConversations, currentConversation, bookmarkedIdsSet]);

  const limitedUnpinnedConversations = useMemo(() => {
    const base = unpinnedConversations.slice(0, MAX_SIDEBAR_CHATS);
    if (currentConversation && !bookmarkedIdsSet.has(currentConversation.id)) {
      const alreadyIncluded = base.some(
        (conversation) => conversation.id === currentConversation.id,
      );
      if (!alreadyIncluded) {
        return [...base, currentConversation];
      }
    }
    return base;
  }, [unpinnedConversations, currentConversation, bookmarkedIdsSet]);

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
      setEditValue(currentTitle || '');
      setEditingId(null);
      return;
    }

    if (trimmedValue !== currentTitle) {
      onConversationEdit?.(conversationId, trimmedValue);
      touchSelectionOrder(conversationId);
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
    storeToggleBookmark(conversationId);
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
      requestAnimationFrame(() => {
        setTimeout(() => {
          editInputRef.current?.focus();
          editInputRef.current?.select();
          setTimeout(() => {
            justEnteredEditModeRef.current = false;
          }, 200);
        }, 100);
      });
    }
  }, [editingId]);

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
              <LoadingSkeleton variant="sidebar" count={3} />
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
                  <div className="from-sidebar pointer-events-none absolute right-0 bottom-0 left-0 z-10 h-12 bg-gradient-to-t to-transparent" />

                  <SidebarMenu className="pb-12">
                    {limitedPinnedConversations.map((conversation) => {
                      const isEditing = editingId === conversation.id;
                      const isActive = conversation.slug === currentSlugFromUrl;
                      const conversationPath = createPath(
                        pathsConfig.app.conversation,
                        conversation.slug,
                      );

                      return (
                        <SidebarMenuItem
                          key={conversation.id}
                          className="group/row"
                        >
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
                                    className="flex w-full min-w-0 items-center gap-2"
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
                                      <div className="flex w-full min-w-0 items-center gap-2">
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
                                        <div className="flex shrink-0 items-center gap-1">
                                          <div className="relative flex items-center justify-center">
                                            {bookmarkedIdsSet.has(
                                              conversation.id,
                                            ) &&
                                              !isActive && (
                                                <Pin className="absolute top-1/2 left-1/2 size-3 -translate-x-1/2 -translate-y-1/2 fill-current text-[#ffcb51] transition-opacity group-hover/row:opacity-0" />
                                              )}
                                            {processingConversationSlug ===
                                            conversation.slug ? (
                                              <span
                                                className="absolute top-1/2 left-1/2 size-2 shrink-0 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-blue-500 shadow-sm shadow-blue-500/50 transition-opacity group-hover/row:opacity-0"
                                                aria-label={t(
                                                  'sidebar.agentProcessing',
                                                )}
                                                title={t(
                                                  'sidebar.agentProcessing',
                                                )}
                                              />
                                            ) : isActive ? (
                                              <div className="bg-primary absolute top-1/2 left-1/2 size-1.5 shrink-0 -translate-x-1/2 -translate-y-1/2 rounded-full transition-opacity group-hover/row:opacity-0" />
                                            ) : null}
                                            <DropdownMenu>
                                              <DropdownMenuTrigger asChild>
                                                <button
                                                  onClick={(e) =>
                                                    e.stopPropagation()
                                                  }
                                                  className="text-muted-foreground hover:text-foreground hover:bg-accent shrink-0 cursor-pointer rounded p-1 opacity-0 transition-all group-hover/row:opacity-100"
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
                                                >
                                                  <Bookmark
                                                    className={cn(
                                                      'mr-2 size-4',
                                                      bookmarkedIdsSet.has(
                                                        conversation.id,
                                                      ) && 'fill-current',
                                                    )}
                                                  />
                                                  {bookmarkedIdsSet.has(
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
                                        </div>
                                      </div>
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
                              <ContextMenuItem
                                onClick={() => handleBookmark(conversation.id)}
                              >
                                <Bookmark
                                  className={cn(
                                    'mr-2 size-4',
                                    bookmarkedIdsSet.has(conversation.id) &&
                                      'fill-current',
                                  )}
                                />
                                {bookmarkedIdsSet.has(conversation.id) ? (
                                  <Trans i18nKey="common:sidebar.unpin" />
                                ) : (
                                  <Trans i18nKey="common:sidebar.pinChat" />
                                )}
                              </ContextMenuItem>
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

                    {limitedUnpinnedConversations.map((conversation) => {
                      const isEditing = editingId === conversation.id;
                      const isActive = conversation.slug === currentSlugFromUrl;
                      const conversationPath = createPath(
                        pathsConfig.app.conversation,
                        conversation.slug,
                      );

                      return (
                        <SidebarMenuItem
                          key={conversation.id}
                          className="group/row"
                        >
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
                                    className="flex w-full min-w-0 items-center gap-2"
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
                                      <div className="flex w-full min-w-0 items-center gap-2">
                                        <span
                                          className={cn(
                                            'min-w-0 flex-1 truncate text-sm font-medium transition-all duration-300',
                                            animatingIds.has(conversation.id) &&
                                              'animate-in fade-in-0 slide-in-from-left-2',
                                          )}
                                          title={`${conversation.title} · ${formatTimeAgo(conversation.createdAt)}`}
                                        >
                                          {truncateChatTitle(
                                            conversation.title,
                                          )}
                                        </span>
                                        <div className="flex shrink-0 items-center gap-1">
                                          <div className="relative flex items-center justify-center">
                                            {bookmarkedIdsSet.has(
                                              conversation.id,
                                            ) &&
                                              !isActive && (
                                                <Pin className="absolute top-1/2 left-1/2 size-3 -translate-x-1/2 -translate-y-1/2 fill-current text-[#ffcb51] transition-opacity group-hover/row:opacity-0" />
                                              )}
                                            {processingConversationSlug ===
                                            conversation.slug ? (
                                              <span
                                                className="absolute top-1/2 left-1/2 size-2 shrink-0 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-blue-500 shadow-sm shadow-blue-500/50 transition-opacity group-hover/row:opacity-0"
                                                aria-label={t(
                                                  'sidebar.agentProcessing',
                                                )}
                                                title={t(
                                                  'sidebar.agentProcessing',
                                                )}
                                              />
                                            ) : isActive ? (
                                              <div className="bg-primary absolute top-1/2 left-1/2 size-1.5 shrink-0 -translate-x-1/2 -translate-y-1/2 rounded-full transition-opacity group-hover/row:opacity-0" />
                                            ) : null}
                                            <DropdownMenu>
                                              <DropdownMenuTrigger asChild>
                                                <button
                                                  onClick={(e) =>
                                                    e.stopPropagation()
                                                  }
                                                  className="text-muted-foreground hover:text-foreground hover:bg-accent shrink-0 cursor-pointer rounded p-1 opacity-0 transition-all group-hover/row:opacity-100"
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
                                                >
                                                  <Bookmark
                                                    className={cn(
                                                      'mr-2 size-4',
                                                      bookmarkedIdsSet.has(
                                                        conversation.id,
                                                      ) && 'fill-current',
                                                    )}
                                                  />
                                                  {bookmarkedIdsSet.has(
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
                                        </div>
                                      </div>
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
                              <ContextMenuItem
                                onClick={() => handleBookmark(conversation.id)}
                              >
                                <Bookmark
                                  className={cn(
                                    'mr-2 size-4',
                                    bookmarkedIdsSet.has(conversation.id) &&
                                      'fill-current',
                                  )}
                                />
                                {bookmarkedIdsSet.has(conversation.id) ? (
                                  <Trans i18nKey="common:sidebar.unpin" />
                                ) : (
                                  <Trans i18nKey="common:sidebar.pinChat" />
                                )}
                              </ContextMenuItem>
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
