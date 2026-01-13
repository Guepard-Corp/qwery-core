import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { v4 as uuidv4 } from 'uuid';
import { Search, Plus } from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupContent,
} from '@qwery/ui/shadcn-sidebar';
import { SidebarNavigation } from '@qwery/ui/sidebar-navigation';
import { Input } from '@qwery/ui/input';

import { AccountDropdownContainer } from '~/components/account-dropdown-container';
import { createNavigationConfig } from '~/config/project.navigation.config';
import { useWorkspace } from '~/lib/context/workspace-context';
import { useGetProjectById } from '~/lib/queries/use-get-projects';
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
import { SidebarConversationHistory } from './sidebar-conversation-history';

export function ProjectSidebar() {
  const { workspace, repositories } = useWorkspace();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const { isProcessing, processingConversationSlug } = useAgentStatus();

  // Get project slug from project data (works for all routes including notebook pages)
  const project = useGetProjectById(
    repositories.project,
    workspace.projectId || '',
  );
  const slug = project.data?.slug;

  const projectSlugMatch = location.pathname.match(/^\/prj\/([^/]+)/);
  const slugFromPath = projectSlugMatch?.[1];
  const finalSlug = slug || slugFromPath;

  // Get conversations
  const projectId = workspace.projectId as string | undefined;
  const { data: conversations = [], isLoading: isLoadingConversations } =
    useGetConversationsByProject(repositories.conversation, projectId);

  // Get current conversation slug
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
    workspace.projectId as string | undefined,
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
    if (!projectId) {
      toast.error('Project not found');
      return;
    }
    createConversationMutation.mutate({
      projectId: projectId,
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
        onSuccess: () => {
          toast.success('Conversation title updated');
        },
        onError: (error) => {
          toast.error(
            `Failed to update conversation: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        },
      },
    );
  };

  const onConversationDelete = (conversationId: string) => {
    deleteConversationMutation.mutate(conversationId, {
      onSuccess: () => {
        toast.success('Conversation deleted');
        if (conversationId === currentConversationId) {
          navigate(createPath(pathsConfig.app.project, finalSlug || ''));
        }
      },
      onError: (error) => {
        toast.error(
          `Failed to delete conversation: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      },
    });
  };

  const onConversationDuplicate = (conversationId: string) => {
    toast.info('Duplicate feature coming soon');
  };

  const onConversationShare = (conversationId: string) => {
    const conversation = conversations.find((c) => c.id === conversationId);
    if (conversation) {
      const url = `${window.location.origin}${createPath(pathsConfig.app.conversation, conversation.slug)}`;
      navigator.clipboard.writeText(url);
      toast.success('Conversation link copied to clipboard');
    }
  };

  const onConversationBookmark = (conversationId: string) => {
    toast.info('Bookmark feature coming soon');
  };

  const navigationConfig = useMemo(() => {
    if (!finalSlug) return null;
    return createNavigationConfig(finalSlug);
  }, [finalSlug]);

  if (!finalSlug || !navigationConfig) {
    return null;
  }

  return (
    <Sidebar collapsible="none" className="w-[18rem] min-w-[18rem] max-w-[18rem]">
      <SidebarContent className="p-4 overflow-hidden">
        <SidebarNavigation config={navigationConfig} />

        {/* Search Bar */}
        <SidebarGroup>
          <SidebarGroupContent>
            <div className="">
              <div className="relative">
                <Search className="text-muted-foreground absolute left-2 top-1/2 size-4 -translate-y-1/2" />
                <Input
                  type="text"
                  placeholder="Search chats..."
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setSearchQuery(e.target.value)
                  }
                  className="pl-8 pr-8 border-transparent hover:border-border focus:border-border"
                />
                <button
                  type="button"
                  onClick={onNewConversation}
                  disabled={createConversationMutation.isPending}
                  className="text-muted-foreground hover:text-foreground absolute right-2 top-1/2 size-4 -translate-y-1/2 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="New conversation"
                >
                  <Plus className="size-4" />
                </button>
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Conversation History */}
        <SidebarConversationHistory
          conversations={mappedConversations}
          isLoading={isLoadingConversations}
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
      </SidebarContent>

      <SidebarFooter>
        {/* Account Dropdown */}
        <AccountDropdownContainer />
      </SidebarFooter>
    </Sidebar>
  );
}
