'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Trans } from '@qwery/ui/trans';
import { Pencil, X, MoreHorizontal, Trash2 } from 'lucide-react';
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
import { sortByDateDesc } from '@qwery/shared/utils';
import { createPath } from '~/config/paths.config';
import pathsConfig from '~/config/paths.config';
import { ConfirmDeleteDialog } from '@qwery/ui/ai';
import { LoadingSkeleton } from '@qwery/ui/loading-skeleton';
import { useProject } from '~/lib/context/project-context';
import { formatTimeAgo } from './sidebar-utils';

export interface SidebarNotebookHistoryProps {
  notebooks?: Array<{
    id: string;
    title: string;
    slug: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
  isLoading?: boolean;
  currentNotebookSlug?: string;
  searchQuery?: string;
  onNotebookSelect?: (notebookSlug: string) => void;
  onNotebookDelete?: (notebookId: string) => void;
  unsavedNotebookIds?: string[];
  isProcessing?: boolean;
}

export function SidebarNotebookHistory({
  notebooks = [],
  isLoading = false,
  currentNotebookSlug,
  searchQuery = '',
  onNotebookSelect: _onNotebookSelect,
  onNotebookDelete,
  unsavedNotebookIds = [],
  isProcessing: _isProcessing = false,
}: SidebarNotebookHistoryProps) {
  const { t } = useTranslation('common');
  const location = useLocation();
  const { projectSlug } = useProject();
  const { state: sidebarState } = useSidebar();

  const notebookSlugMatch = location.pathname.match(/\/notebook\/([^/]+)$/);
  const currentSlugFromUrl = notebookSlugMatch?.[1];

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
    if (
      prevSidebarStateRef.current === 'expanded' &&
      sidebarState === 'collapsed'
    ) {
      queueMicrotask(() => setIsRecentsOpen(false));
    }
    prevSidebarStateRef.current = sidebarState;
  }, [sidebarState]);

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
    return sortByDateDesc([...filtered], (n) => n.updatedAt);
  }, [notebooks, searchQuery]);

  const activeNotebookSlug = currentSlugFromUrl || currentNotebookSlug;

  const MAX_SIDEBAR_NOTEBOOKS = 5;
  const limitedNotebooks = useMemo(
    () => filteredNotebooks.slice(0, MAX_SIDEBAR_NOTEBOOKS),
    [filteredNotebooks],
  );

  const hasNotebooks = filteredNotebooks.length > 0;

  useEffect(() => {
    if (isLoading || initialOpenSetRef.current) return;
    initialOpenSetRef.current = true;
    setTimeout(() => {
      setIsRecentsOpen(!!hasNotebooks);
    }, 0);
  }, [isLoading, hasNotebooks]);

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
                    {limitedNotebooks.map((notebook) => {
                      const isEditing = editingId === notebook.id;
                      const isActive = notebook.slug === activeNotebookSlug;
                      const notebookPath = createPath(
                        pathsConfig.app.projectNotebook,
                        notebook.slug,
                      );

                      return (
                        <SidebarMenuItem
                          key={notebook.id}
                          className="group/row"
                        >
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
                                          title={`${notebook.title} · ${formatTimeAgo(notebook.updatedAt)}`}
                                        >
                                          {truncateChatTitle(notebook.title)}
                                        </span>
                                        {unsavedNotebookIds.includes(
                                          notebook.id,
                                        ) && (
                                          <span
                                            className="size-2 shrink-0 rounded-full border border-yellow-500/50 bg-yellow-500 shadow-sm shadow-yellow-500/50"
                                            aria-label={t(
                                              'sidebar.unsavedChanges',
                                            )}
                                            title={t('sidebar.unsavedChanges')}
                                          />
                                        )}
                                        <div className="relative shrink-0">
                                          {isActive && (
                                            <div className="bg-primary absolute top-1/2 left-1/2 size-1.5 shrink-0 -translate-x-1/2 -translate-y-1/2 rounded-full transition-opacity group-hover/row:opacity-0" />
                                          )}
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
