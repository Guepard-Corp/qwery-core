'use client';

import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { v4 as uuidv4 } from 'uuid';
import { Search, Plus, MessageCircle, Notebook } from 'lucide-react';

import { SidebarGroup, SidebarGroupContent } from '@qwery/ui/shadcn-sidebar';
import { Input } from '@qwery/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@qwery/ui/dropdown-menu';

import { useWorkspace } from '~/lib/context/workspace-context';
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
  const projectContext = useProjectOptional();
  const { workspace, repositories } = useWorkspace();
  const projectId = projectContext?.projectId;
  const projectSlug = projectContext?.projectSlug ?? undefined;
  const isProjectLoading = projectContext?.isLoading ?? false;
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const { isProcessing, processingConversationSlug } = useAgentStatus();

  const { data: conversations = [], isLoading: isLoadingConversations } =
    useGetConversationsByProject(repositories.conversation, projectId);

  const notebooks = useGetNotebooksByProjectId(
    repositories.notebook,
    projectId,
    { enabled: !!projectId },
  );
  const notebooksList = notebooks.data || [];

  const notebookSlugMatch = location.pathname.match(/\/notebooks\/([^/]+)$/);
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
      toast.error(
        `Failed to create conversation: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
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
        onError: (error) =>
          toast.error(
            `Failed to update conversation: ${error instanceof Error ? error.message : 'Unknown error'}`,
          ),
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
      onError: (error) =>
        toast.error(
          `Failed to delete conversation: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
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

  const onConversationBookmark = () => {
    toast.info('Bookmark feature coming soon');
  };

  const createNotebookMutation = useCreateNotebook(
    repositories.notebook,
    (notebook) => {
      navigate(createPath(pathsConfig.app.projectNotebook, notebook.slug));
    },
    (error) => {
      toast.error(
        `Failed to create notebook: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
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
    (error) =>
      toast.error(
        `Failed to delete notebook: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ),
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
        updatedAt: notebook.updatedAt,
      })),

    [notebooksList],
  );

  if (!projectId) return null;

  return (
    <>
      <SidebarGroup>
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
                <DropdownMenuItem onClick={onNewNotebook}>
                  <Notebook className="mr-2 size-4" />
                  New Notebook
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
      <div className="flex flex-col">
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
          onConversationBookmark={onConversationBookmark}
        />
        <SidebarNotebookHistory
          notebooks={mappedNotebooks}
          isLoading={isProjectLoading || notebooks.isLoading}
          currentNotebookSlug={currentNotebookSlug}
          searchQuery={searchQuery}
          onNotebookDelete={onNotebookDelete}
        />
      </div>
    </>
  );
}
