'use client';

import { useMemo, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { v4 as uuidv4 } from 'uuid';
import { Search, Plus, MessageCircle, Notebook } from 'lucide-react';

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
  useSidebar,
} from '@qwery/ui/shadcn-sidebar';
import { cn } from '@qwery/ui/utils';
import { Input } from '@qwery/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@qwery/ui/dropdown-menu';

import { useWorkspace } from '~/lib/context/workspace-context';
import { WorkspaceModeEnum } from '@qwery/domain/enums';
import { useProjectOptional } from '~/lib/context/project-context';
import { useGetConversationsByProject } from '~/lib/queries/use-get-conversations-by-project';
import { Conversation } from '@qwery/domain/entities';
import pathsConfig from '~/config/paths.config';
import { createPath } from '~/config/paths.config';
import {
  useConversation,
  useUpdateConversation,
  useDeleteConversation,
} from '~/lib/mutations/use-conversation';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { getErrorKey } from '~/lib/utils/error-key';
import { useAgentStatus } from '@qwery/ui/ai';
import {
  SidebarConversationHistory,
  SidebarNotebookHistory,
} from './sidebar-conversation-history';
import { useGetNotebooksByProjectId } from '~/lib/queries/use-get-notebook';
import {
  useCreateNotebook,
  useDeleteNotebook,
} from '~/lib/mutations/use-notebook';
import type { NotebookOutput } from '@qwery/domain/usecases';

export function ProjectChatNotebookSidebarContent() {
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';
  const { t } = useTranslation('common');
  const projectContext = useProjectOptional();
  const { workspace, repositories } = useWorkspace();
  const isSimpleMode = workspace.mode === WorkspaceModeEnum.SIMPLE;
  const projectId = projectContext?.projectId;
  const projectSlug = projectContext?.projectSlug ?? undefined;
  const isProjectLoading = projectContext?.isLoading ?? false;
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [unsavedNotebookIds, setUnsavedNotebookIds] = useState<string[]>(() => {
    try {
      return JSON.parse(
        localStorage.getItem('notebook:unsaved') || '[]',
      ) as string[];
    } catch {
      return [];
    }
  });
  const { isProcessing, processingConversationSlug } = useAgentStatus();

  useEffect(() => {
    const handleUnsavedChanged = () => {
      try {
        const unsaved = JSON.parse(
          localStorage.getItem('notebook:unsaved') || '[]',
        ) as string[];
        setUnsavedNotebookIds(unsaved);
      } catch {
        setUnsavedNotebookIds([]);
      }
    };
    handleUnsavedChanged();
    window.addEventListener('storage', handleUnsavedChanged);
    window.addEventListener('notebook:unsaved-changed', handleUnsavedChanged);
    return () => {
      window.removeEventListener('storage', handleUnsavedChanged);
      window.removeEventListener(
        'notebook:unsaved-changed',
        handleUnsavedChanged,
      );
    };
  }, []);

  const { data: conversations = [], isLoading: isLoadingConversations } =
    useGetConversationsByProject(repositories.conversation, projectId);

  const notebooks = useGetNotebooksByProjectId(
    repositories.notebook,
    projectId,
    { enabled: !!projectId },
  );
  const notebooksList = useMemo(() => notebooks.data || [], [notebooks.data]);

  const notebookSlugMatch = location.pathname.match(/\/notebook\/([^/]+)$/);
  const currentNotebookSlug = notebookSlugMatch?.[1];

  const conversationSlugMatch = location.pathname.match(/\/c\/([^/]+)$/);
  const currentConversationSlug = conversationSlugMatch?.[1];
  const currentConversation = conversations.find(
    (c: Conversation) => c.slug === currentConversationSlug,
  );
  const currentConversationId = currentConversation?.id;

  const createConversationMutation = useConversation(
    repositories.conversation,
    (conversation) => {
      navigate(createPath(pathsConfig.app.conversation, conversation.slug));
    },
    (error) => {
      toast.error(getErrorKey(error, t));
    },
    projectId,
  );

  const updateConversationMutation = useUpdateConversation(
    repositories.conversation,
  );

  const deleteConversationMutation = useDeleteConversation(
    repositories.conversation,
  );

  const mappedConversations = useMemo(
    () =>
      conversations.map((conversation: Conversation) => ({
        id: conversation.id,
        slug: conversation.slug,
        title: conversation.title,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      })),
    [conversations],
  );

  const onNewConversation = () => {
    if (!projectId) return;
    createConversationMutation.mutate({
      projectId,
      taskId: uuidv4(),
      title: 'New Conversation',
      seedMessage: '',
      datasources: [],
      createdBy: workspace.userId,
    });
  };

  const onConversationSelect = (conversationSlug: string) => {
    navigate(createPath(pathsConfig.app.conversation, conversationSlug));
  };

  const onConversationEdit = (conversationId: string, newTitle: string) => {
    updateConversationMutation.mutate(
      {
        id: conversationId,
        title: newTitle,
        updatedBy: workspace.userId,
      },
      {
        onSuccess: () => toast.success('Conversation title updated'),
        onError: (error) => toast.error(getErrorKey(error, t)),
      },
    );
  };

  const onConversationDelete = (conversationId: string) => {
    deleteConversationMutation.mutate(conversationId, {
      onSuccess: () => {
        toast.success('Conversation deleted');
        if (conversationId === currentConversationId) {
          navigate(createPath(pathsConfig.app.project, projectSlug || ''));
        }
      },
      onError: (error) => toast.error(getErrorKey(error, t)),
    });
  };

  const onConversationDuplicate = () => {
    toast.info('Duplicate feature coming soon');
  };

  const onConversationShare = (_conversationId: string) => {
    const conversation = conversations.find((c) => c.id === _conversationId);
    if (conversation) {
      navigator.clipboard.writeText(
        `${window.location.origin}${createPath(pathsConfig.app.conversation, conversation.slug)}`,
      );
      toast.success('Conversation link copied to clipboard');
    }
  };

  const createNotebookMutation = useCreateNotebook(
    repositories.notebook,
    (notebook) => {
      navigate(createPath(pathsConfig.app.projectNotebook, notebook.slug));
    },
    (error) => {
      toast.error(getErrorKey(error, t));
    },
  );

  const onNewNotebook = () => {
    if (!projectId) return;
    createNotebookMutation.mutate({
      projectId,
      title: 'New Notebook',
    });
  };

  const deleteNotebookMutation = useDeleteNotebook(
    repositories.notebook,
    () => {
      toast.success('Notebook deleted');
      notebooks.refetch();
      if (currentNotebookSlug) {
        navigate(createPath(pathsConfig.app.project, projectSlug || ''));
      }
    },
    (error) => toast.error(getErrorKey(error, t)),
  );

  const onNotebookDelete = (notebookId: string) => {
    const notebook = notebooksList.find((n) => n.id === notebookId);
    if (notebook && projectId) {
      deleteNotebookMutation.mutate({
        id: notebook.id,
        slug: notebook.slug,
        projectId,
      });
    }
  };

  const mappedNotebooks = useMemo(
    () =>
      notebooksList.map((notebook: NotebookOutput) => ({
        id: notebook.id,
        title: notebook.title,
        slug: notebook.slug,
        createdAt: notebook.createdAt,
        updatedAt: notebook.updatedAt,
      })),

    [notebooksList],
  );

  if (!projectId) return null;

  return (
    <>
      <SidebarGroup
        className={cn(
          'overflow-hidden transition-[max-height,opacity,padding] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
          isCollapsed ? 'max-h-0 !py-0 opacity-0' : 'max-h-24 opacity-100',
        )}
      >
        <SidebarGroupContent>
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-2 size-4 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Search chats and notebooks..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSearchQuery(e.target.value)
              }
              className="hover:border-border focus:border-border border-transparent pr-8 pl-8"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground hover:bg-accent absolute top-1/2 right-1.5 flex size-6 -translate-y-1/2 items-center justify-center rounded transition-colors"
                  title="New chat or notebook"
                >
                  <Plus className="size-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem
                  onClick={onNewConversation}
                  disabled={createConversationMutation.isPending}
                >
                  <MessageCircle className="mr-2 size-4" />
                  New Chat
                </DropdownMenuItem>
                {!isSimpleMode && (
                  <DropdownMenuItem onClick={onNewNotebook}>
                    <Notebook className="mr-2 size-4" />
                    New Notebook
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </SidebarGroupContent>
      </SidebarGroup>

      {/* Collapsed-mode icon buttons for New Chat / New Notebook */}
      <SidebarGroup
        className={cn(
          'overflow-hidden transition-[max-height,opacity,padding] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
          isCollapsed
            ? 'max-h-40 opacity-100'
            : 'pointer-events-none max-h-0 !py-0 opacity-0',
        )}
      >
        <SidebarSeparator className="mb-1" />
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="New Chat"
                onClick={onNewConversation}
                className="justify-center"
              >
                <MessageCircle className="size-4" />
              </SidebarMenuButton>
            </SidebarMenuItem>
            {!isSimpleMode && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="New Notebook"
                  onClick={onNewNotebook}
                  className="justify-center"
                >
                  <Notebook className="size-4" />
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
      <div
        className={cn(
          'flex flex-col overflow-hidden transition-[opacity] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
          isCollapsed ? 'pointer-events-none opacity-0' : 'opacity-100',
        )}
      >
        <SidebarConversationHistory
          conversations={mappedConversations}
          isLoading={isProjectLoading || isLoadingConversations}
          currentConversationId={currentConversationId}
          isProcessing={isProcessing}
          processingConversationSlug={processingConversationSlug || undefined}
          searchQuery={searchQuery}
          onConversationSelect={onConversationSelect}
          onConversationEdit={onConversationEdit}
          onConversationDelete={onConversationDelete}
          onConversationDuplicate={onConversationDuplicate}
          onConversationShare={onConversationShare}
        />
        {!isSimpleMode && (
          <SidebarNotebookHistory
            notebooks={mappedNotebooks}
            isLoading={isProjectLoading || notebooks.isLoading}
            currentNotebookSlug={currentNotebookSlug}
            searchQuery={searchQuery}
            onNotebookDelete={onNotebookDelete}
            unsavedNotebookIds={unsavedNotebookIds}
            isProcessing={isProcessing}
          />
        )}
      </div>
    </>
  );
}
